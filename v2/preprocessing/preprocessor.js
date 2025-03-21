const fs = require('fs');
const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
const snippetGenerator = require('../codegen/snippet-generator')
const VAR_PREFIX = config.varPrefix;
const ITEM_PREFIX = config.itemVar
const INDEX_PREFIX = config.indexVar
const PARENT_ALIAS = "$PARENT"
const MAP_ITEM_ALIAS = "$ITEM"
const MAP_INDEX_ALIAS = "$INDEX"

const UNSUBSCRIBE_ARRAY = "__UNSB__"

const METADATA_UPDATE_ALL_PROPS = '!'
const METADATA_INVALIDATE_CHILDREN = '&'

const ITERATION_MAX = 10
let ITERATION_CURRENT = 0

const SNIPPETS = snippetGenerator.SNIPPETS

const DEFAULT_CONTEXT = Object.freeze({
  inFor: false,
  isRoot: false
})

const INTERNAL_PROPS = [
  "nolocal",
  "key",
  "id"
]


let varCounter = 0;

const makeSnippet = (snippetType, args) => {
  return {
    type: 'snippet',
    variant: snippetType,
    args: args
  }
}

const findRootElement = (component) => {
  return component.elements.find(element => element.type === 'element' && element.context.isRoot)
}

function defineParent(node, parent) {
    node.parent = parent;
    let proxiedParent;
    if (['map', 'if', 'use_effect'].includes(node.type)) proxiedParent = parent
    else proxiedParent = node.varName
    if(node.children?.length) node.children.forEach(child => {defineParent(child, proxiedParent)})
}

function defineVarName(node) {
    if (node.type === 'element') {
        node.varName = `${VAR_PREFIX}${varCounter++}`
        if (node.children.length) node.children.forEach(child => {defineVarName(child)})
    }
    if (node.type === 'use_effect') {
        node.varName = `_eff${VAR_PREFIX}${varCounter++}`
    }
    if (['map', 'if'].includes(node.type)) {
        if (node.children.length) node.children.forEach(child => {defineVarName(child)})
    }
}

function replaceParentAlias(node) {
    if (['inline', 'inject'].includes(node.type)) {
        node.code = node.code.replaceAll(PARENT_ALIAS, node.parent)
    }
    if (['map', 'if', 'use_effect'].includes(node.type)) {
      node.body = node.body.replaceAll(PARENT_ALIAS, node.parent)
    }
    if (node.type === 'element') {
        // Replace also in the element props
        Array.from([node.commonProps, node.reactiveProps, node.internalProps]).forEach(props => {
          Object.entries(props).forEach(([propName, propContent]) => {
            propContent.value ? propContent.value = propContent.value.replaceAll(PARENT_ALIAS, node.parent) : propContent
            return {propName: propContent}
          })
        })
    }
    if (node.children) node.children.forEach(child => {replaceParentAlias(child)})
}

function replaceMapAliases(node) {
    // MAP directive has special aliases: $INDEX & $ITEM; It uses them on CodeGen
    if (node.type === 'map') {
        // pass
    }
    // Replace MAP aliases only if they inside of directive
    if (node.type === 'element' && node.context.inFor) {
      Array.from([node.commonProps, node.reactiveProps, node.internalProps]).forEach(props => {
        Object.entries(props).forEach(([propName, propContent]) => {
          propContent.value ? propContent.value = propContent.value.replaceAll(MAP_INDEX_ALIAS, INDEX_PREFIX) : propContent
          propContent.value ? propContent.value = propContent.value.replaceAll(MAP_ITEM_ALIAS, ITEM_PREFIX) : propContent
          return {propName: propContent}
        })
      })
    }
    if (node.type === 'inline' && node.context.inFor) {
      node.code = node.code.replaceAll(MAP_INDEX_ALIAS, INDEX_PREFIX).replaceAll(MAP_ITEM_ALIAS, ITEM_PREFIX)
    }
    if (node.children) node.children.forEach(child => {replaceMapAliases(child)})
}

/**
 * Groups props by their type
 * Common - initialized at mount
 * Reactive - initialized at mound and activate subscribe
 * Iternal - not initialized and used for preprocessing & codegen
 */
function groupProps(node) {
    if (node.type === 'element') {
        node.commonProps = {}
        node.reactiveProps = {}
        node.internalProps = {}
        Object.entries(node.props).forEach(([propName, propContent]) => {
            if (INTERNAL_PROPS.includes(propName)) {
              node.internalProps[propName] = propContent
            }
            else if (propContent && propContent.value && propContent.value.match('@')) {
                // Need to find reactive variables
                const reactiveDependencies = propContent.value.match(/@[a-zA-Z0-9._]+\b/g)
                // Save found deps into reactive props, clear them from reactive directive and prepare array for root deps
                node.reactiveProps[propName] = {...propContent, value: propContent.value.replaceAll('@', ''), dependencies: []}
                // Then we need to calculate which state this prop depends on
                reactiveDependencies.map(dep => {
                    const rootDependency = dep.match('.') ? dep.split('.')[0] : dep
                    node.reactiveProps[propName].dependencies.push(rootDependency)
                })
            }
            else {
                node.commonProps[propName] = {...propContent}
            }
            delete node.props
        })
        if (node.children.length) node.children.forEach(child => {groupProps(child)})
    }

    // Skip map and if; then process their children
    // For reactive variables in this directives will be included REACTIVE_MAP and REACTIVE_IF directives
    if (['map', 'if'].includes(node.type)) {
        if (node.children.length) node.children.forEach(child => {groupProps(child)})
    }
}

// Analyze context on different states
function analyzeContext(node) {
  if (node.type === 'map') {
    if (node.children && node.children.length) {
      node.children.forEach(child => {
        child.context = {...child.context, inFor: true}
        analyzeContext(child)
      })
    }
  }
  if (node.type === 'element' && node.children && node.children.length) {
    node.children.forEach(child => {
      child.context = {...child.context, inFor: node.context.inFor}
      analyzeContext(child)
    })
  } 
}

/**
 * One of the important part of context - Internal functions
 * @pushNodeToParentChildrenSectionBegin Called from SomeNode and inserts NewNode to SomeNode.ParentNode start
 * @pushNodeToParentChildrenSectionEnd Called from SomeNode and inserts NewNode to SomeNode.ParentNode end
 * @wrapSelfWithNode
 * - NOT RECOMMENDED
 * - Called from SomeNode and put SomeNode inside the NewNode;
 * - NewNode replaces SomeNode in tree hierarchy and NewNode.ParentNode now equals last SomeNode.ParentNode
 * @wrapSelfGroupWithNode
 * - NOT RECOMMENDED
 * - Called from SomeNode and put SomeNode with it's Siblings inside the NewNode; 
 * - NewNode replaces children of SomeNode.Parent in tree hierarchy
 */
const attachInternalFunctionsToNode = (parent, child) => {
  child.context.pushNodeToParentChildrenSectionBegin = (newNode) => {
    newNode.context = {...DEFAULT_CONTEXT, inFor: child.context.inFor}
    parent.children = [newNode, ...parent.children]
  }
  child.context.pushNodeToParentChildrenSectionEnd = (newNode) => {
    newNode.context = {...DEFAULT_CONTEXT, inFor: child.context.inFor}
    parent.children = [...parent.children, newNode]
  }
  child.context.wrapSelfWithNode = (newNode) => {
    newNode.context = {...DEFAULT_CONTEXT, inFor: child.context.inFor}
    const index = parent.children.indexOf(child);
    if (index === -1) return;

    const nodeClone = { ...child, context: { ...child.context } };

    parent.children[index] = newNode;
    attachInternalFunctionsToNode(parent, newNode)
    attachInternalFunctionsToNode(newNode, nodeClone)
    newNode.children = [nodeClone]
  }
  child.context.wrapSelfGroupWithNode = (newNode) => {
    newNode.context = {...DEFAULT_CONTEXT, inFor: child.context.inFor}
    const childrenClone = {...parent.children}

    attachInternalFunctionsToNode(parent, newNode)
    parent.children = [newNode]
    childrenClone.forEach(clone => {attachInternalFunctionsToNode(newNode, clone)})
    newNode.children = childrenClone   
  }
}

// Need to init default context for all nodes in AST
function initContext(node) {
  if (!node.context) node.context = {...DEFAULT_CONTEXT}
  if (node.children) {
    node.children.forEach(child => {
      if (!child.context) child.context = {...DEFAULT_CONTEXT}
      attachInternalFunctionsToNode(node, child)
      initContext(child)
    })
  }
}

// If element has nolocal prop than it will be global (NOT RECOMMENDED)
function handleNoLocal(node) {
  if (node.type === 'element') {
    node.props.nolocal ? node.context.isLocal = false : node.context.isLocal = true
  }
  if (node.children) node.children.forEach(child => {
    handleNoLocal(child)
  })
}

function applyRecursivly(node, effect) {
    effect(node)
    if (node.children && node.children.length) node.children.forEach(child => {applyRecursivly(child, effect)})
}

// Declares for each root component table of subscribtions and then redefines them OnRemove property to handle unsubscriptions
function handleUnsubscription(tree) {
  tree.forEach(rootNode => {
    if (rootNode.type === 'component') {
      const rootElement = findRootElement(rootNode)
      const subscribtionTable = makeSnippet(SNIPPETS.CREATE_EMPTY_TABLE, {name: UNSUBSCRIBE_ARRAY, isLocal: true})
      
      // If root onRemove was customized by user so we need to integrate customization at the OnRemove property
      const rootOnRemove = rootElement.commonProps.onRemove || rootElement.reactiveProps.onRemove
      const onComponentRemove = makeSnippet(SNIPPETS.REDEFINE_ON_REMOVE, {elementName: rootElement.varName, body: rootOnRemove ? rootOnRemove : ''})
      rootNode.elements = [subscribtionTable, ...rootNode.elements, onComponentRemove]
    }
  })
} 

// If element has component argument as parent then it will be the root element
function defineRootElement(component) {
  const rootElement = component.elements.find(element => element.type === 'element' && element.parent === 'PARENT')
  if (rootElement) rootElement.context.isRoot = true
}

function createSubscriptions(node) {
  if (node.type === 'element') {
      const reactiveOriginDeps = node.subscriptions.map(sub => {
      sub.name = '@' + sub.name
      return sub
    })

    reactiveOriginDeps.map(rod => {
      const keyProp = Object.entries(node.internalProps).find(([key, val]) => key === 'key')

      const underlayingReactiveProps = Object.entries(node.reactiveProps).filter(([propName, propContent]) => propContent.dependencies.includes(rod.name))

      // elementName reactiveDependency reactiveProps
      const updateFunctionName = `${node.varName}.__update__${rod.value}`
      const updateFunctionSnippet = makeSnippet(SNIPPETS.CREATE_UPDATE_FUNCTION, {name: updateFunctionName, elementName: node.varName, elementTag: node.tag, reactiveDependency: rod.name, reactiveProps: underlayingReactiveProps})
      node.context.pushNodeToParentChildrenSectionEnd(updateFunctionSnippet)

      // uniqueName elementName reactiveDependency key?
      const unsubscriptionName = `__UNSB__["__unsb__${node.varName}_${rod.value}"${keyProp ? ` .. ${keyProp[1].value}` : '' }]`
      const subscriptionSnippet = makeSnippet(SNIPPETS.SUBSCRIBE, {name: unsubscriptionName, elementName: node.varName, reactiveDependency: rod.name, updateCallbackName: updateFunctionName})
      node.context.pushNodeToParentChildrenSectionEnd(subscriptionSnippet)
    })
  }
  if (node.children) node.children.forEach(child => {createSubscriptions(child)})
}

function preprocessingPipeline(tree) {
    // Define context on preprocessing
    tree.forEach(rootNode => {
        if (rootNode.type === 'component') {
            initContext(rootNode)
            rootNode.elements.forEach(element => {initContext(element)})
            rootNode.elements.forEach(element => {analyzeContext(element)})
        }
    });

    // Scan tree and marks root element in context
    tree.forEach(rootNode => {
      if (rootNode.type === 'component') {
        defineRootElement(rootNode)
      }
    })

    // Handle nolocal directive
    tree.forEach(rootNode => {
      if (rootNode.type === 'component') {
        rootNode.elements.forEach(element => {handleNoLocal(element)})
      }
    })

    // Define variable names
    tree.forEach(rootNode => {
      if (rootNode.type === 'component') {
          rootNode.elements.forEach(element => {defineVarName(element)})
      }
    });

    // Define parents
    tree.forEach(rootNode => {
        if (rootNode.type === 'component') {
            rootNode.elements.forEach(element => {defineParent(element, "PARENT")})
        }
        rootNode.parent = "NOPARRENT"
    })

    // Define root elements
    tree.forEach(rootNode => {
      if (rootNode.type === 'component') {
        defineRootElement(rootNode)
      }
    })

    // Group props by reactive & common
    tree.forEach(rootNode => {
      if (rootNode.type === 'component') {
          rootNode.elements.forEach(element => {groupProps(element)})
      }
    })

    // Generates snippets to handle unsubscription
    handleUnsubscription(tree)

    tree.forEach(rootNode => {
      if (rootNode.type === 'component') {
        rootNode.elements.forEach(element => {createSubscriptions(element)})
      }
    })

    // Replace aliases
    tree.forEach(rootNode => {
      if (rootNode.type === 'component') {
        rootNode.elements.forEach(element => {replaceParentAlias(element)})
        rootNode.elements.forEach(element => {replaceMapAliases(element)})
      }
    })

    console.dir(tree, { depth: null });

    // Undefine context after preprocessing
    // tree.forEach(rootNode => {
    //     if (rootNode.type === 'component') {
    //         rootNode.elements.forEach(element => {applyRecursivly(element, (element) => {delete element.context} )})
    //     }
    // });
    return tree
}

module.exports.preprocessingPipeline = preprocessingPipeline

// preprocessingPipeline(test)