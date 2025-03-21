const test = [
  {
    type: 'external',
    code: "include('ldxflib.lua')\r\nif SERVER then \r\n    AddCSLuaFile() \r\nend\r\n"
  },
  {
    component: 'TestMenu',
    type: 'component',
    elements: [
      { type: 'inline', code: 'local counter = useState(0)' },
      {
        tag: 'DFrame',
        type: 'element',
        subscriptions: [],
        props: {
          id: { variant: 'default', value: '"root"' },
          size: { variant: 'default', value: '500, 700' },
          popup: null,
          pos: { variant: 'default', value: '0, 0' },
          title: { variant: 'default', value: '""' },
          draggable: { variant: 'default', value: 'false' }
        },
        children: [
          {
            type: 'map',
            body: '{0,0,0,0,0}',
            children: [
              {
                tag: 'DLabel',
                type: 'element',
                props: {
                  key: { variant: 'default', value: '$INDEX' },
                  pos: {
                    variant: 'default',
                    value: '150 * 0.5 * $PARENT, 40'
                  },
                  size: { variant: 'default', value: '200, 100' },
                  sizeToContents: null,
                  setText: { variant: 'default', value: '@counter.value' }
                },
                children: [],
                subscriptions: [
                  {
                    name: 'counter',
                    onUpdate: null,
                    metadata: [ '!', '&' ]
                  }
                ]
              }
            ]
          },
          {
            tag: 'DButton',
            type: 'element',
            props: {
              size: { variant: 'default', value: '200, 60' },
              pos: { variant: 'default', value: '300, 300' },
              setText: { variant: 'default', value: '"Increase counter"' },
              doClick: {
                variant: 'default',
                value: 'function() \r\n' +
                  '                    counter.setState(function(prev) return prev + 1 end) \r\n' +
                  '                end'
              }
            },
            children: [],
            subscriptions: []
          },
          { type: 'inline', code: 'local a = 5' },
          {
            tag: 'DLabel',
            type: 'element',
            props: {
              size: { variant: 'default', value: 'default' },
              pos: { variant: 'classFunc', value: 'classFunc' },
              setText: { variant: 'property', value: 'property' },
              alignBottom: { variant: 'func', value: 'func' },
              center: null
            },
            children: [],
            subscriptions: []
          },
          {
            type: 'use_effect',
            body: 'function()\r\n' +
              '                print("Mounted")\r\n' +
              '                return function()\r\n' +
              '                    print("Unmounted")\r\n' +
              '                end\r\n' +
              '            end',
            dependencies: [ 'counter' ]
          },
          {
            type: 'inject',
            name: 'NotableMenu',
            arg: 'LDX_INPUT_ARGS',
            code: 'NotableMenu(LDX_INPUT_ARGS, $PARENT)'
          }
        ]
      }
    ]
  },
  {
    component: 'NotableMenu',
    type: 'component',
    elements: [
      { type: 'inline', code: 'local counter = useState(0);' },
      {
        tag: 'DFrame',
        type: 'element',
        subscriptions: [],
        props: {
          id: { variant: 'default', value: '"root"' },
          size: { variant: 'default', value: '500, 700' },
          popup: null,
          pos: { variant: 'default', value: '0, 0' },
          title: { variant: 'default', value: '""' },
          draggable: { variant: 'default', value: 'false' }
        },
        children: []
      }
    ]
  },
  {
    type: 'external',
    code: 'concommand.Add("open_ui3", function()\r\n        TestMenu()\r\n    end)\r\n'
  }
]

const fs = require('fs');
const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
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

const SNIPPETS = {
  CREATE_FUNCTION: "CREATE_FUNCTION", // name args
  END_SOMESTING: "END_SOMETHING",
  CREATE_VARIABLE: "CREATE_VARIABLE", // isLocal? name value
  CREATE_EMPTY_TABLE: "CREATE_EMPTY_TABLE", // isLocal? name
  SUBSCRIBE: "SUBSCRIBE", // key reactiveVar callback
  REDEFINE_ON_REMOVE: "REDEFINE_ON_REMOVE", // componentName body
  CALL_CLASS_METHOD: "CALL_CLASS_METHOD", // class name args
  CALL_FUNCTION: "CALL_FUNCTION", // name args
  REDEFINE_PROPERTY: "REDEFINE_PROPERTY", // class property value,
  ADD_ITEM_TO_TABLE: "ADD_ITEM_TO_TABLE" // table key value
}

const DEFAULT_CONTEXT = {
  inFor: false,
  isRoot: false
}


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
    if (node.type === 'use_effect') {
        node.body = node.body.replaceAll(PARENT_ALIAS, node.parent)
    }
    if (node.type === 'element') {
        // Replace also in the element props
        Object.entries(node.props).map(([propName, propContent]) => {
            propContent ? propContent.value = propContent.value.replaceAll(PARENT_ALIAS, node.parent) : propContent
            return {propName: propContent}
        })
        if (node.children.length) node.children.forEach(child => {replaceParentAlias(child)})
    }
    if (['map', 'if'].includes(node.type)) {
        node.body = node.body.replaceAll(PARENT_ALIAS, node.parent)
        if (node.children.length) node.children.forEach(child => {replaceParentAlias(child)})
    }
}

function replaceMapAliases(node) {
    // MAP directive has special aliases: $INDEX & $ITEM; It uses them on CodeGen
    if (node.type === 'map') {
        if (node.children.length) node.children.forEach(child => {replaceMapAliases(child)})
    }
    // Replace MAP aliases only if they inside of directive
    if (node.type === 'element' && node.context.inFor) {
        Object.entries(node.props).map(([propName, propContent]) => {
            propContent ? propContent.value = propContent.value.replaceAll(MAP_INDEX_ALIAS, INDEX_PREFIX) : propContent
            propContent ? propContent.value = propContent.value.replaceAll(MAP_ITEM_ALIAS, ITEM_PREFIX) : propContent
            return {propName: propContent}
        })
    }
    if (node.type === 'inline' && node.context.inFor) {
      node.code = node.code.replaceAll(MAP_INDEX_ALIAS, INDEX_PREFIX).replaceAll(MAP_ITEM_ALIAS, ITEM_PREFIX)
    }
    // Continue to iterate others
    if (node.type === 'element' && node.children.length) {
      node.children.forEach(child => {replaceMapAliases(child)})
    }
}

/**
 * Groups propr by their type
 * Common - initialized at mount
 * Reactive - initialized at mound and activate subscribe
 * Shared - initialized at mount and can be attached to the reactive subscribe
 */
function groupProps(node) {
    if (node.type === 'element') {
        node.commonProps = {}
        node.reactiveProps = {}
        node.sharedProps = {}
        Object.entries(node.props).forEach(([propName, propContent]) => {
            if (propContent && propContent.value && propContent.value.match('@')) {
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

// Need to init default context for all nodes in AST
function initContext(node) {
  if (!node.context) node.context = DEFAULT_CONTEXT
  if (node.children) {
    node.children.forEach(child => {
      if (!child.context) child.context = DEFAULT_CONTEXT
      child.context.pushNodeToParentChildrenSectionBegin = (newNode) => {
        node.children = [newNode, ...node.children]
      }
      child.context.pushNodeToParentChildrenSectionEnd = (newNode) => {
        node.children = [...node.children, newNode]
      }
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
      const subscribtionTable = makeSnippet(SNIPPETS.CREATE_EMPTY_TABLE, {varName: UNSUBSCRIBE_ARRAY, isLocal: true})
      const onComponentRemove = makeSnippet(SNIPPETS.REDEFINE_ON_REMOVE, {componentName: rootElement.varName, body: ''})
      rootNode.elements = [subscribtionTable, ...rootNode.elements, onComponentRemove]
    }
  })
} 

// If element has component argument as parent then it will be the root element
function defineRootElement(component) {
  const rootElement = component.elements.find(element => element.type === 'element' && element.parent === 'PARENT')
  if (rootElement) rootElement.context.isRoot = true
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

    // Replace aliases
    tree.forEach(rootNode => {
        if (rootNode.type === 'component') {
            rootNode.elements.forEach(element => {replaceParentAlias(element)})
            rootNode.elements.forEach(element => {replaceMapAliases(element)})
        }
    })

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

   console.dir(tree, { depth: null });

    // Undefine context after preprocessing
    tree.forEach(rootNode => {
        if (rootNode.type === 'component') {
            rootNode.elements.forEach(element => {applyRecursivly(element, (element) => {delete element.context} )})
        }
    });
}

preprocessingPipeline(test)