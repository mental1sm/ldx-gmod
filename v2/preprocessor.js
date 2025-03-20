const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const VAR_PREFIX = config.varPrefix;
const ITEM_PREFIX = config.itemVar
const INDEX_PREFIX = config.indexVar
const PARENT_ALIAS = "$PARENT"
const MAP_ITEM_ALIAS = "$ITEM"
const MAP_INDEX_ALIAS = "$INDEX"

const METADATA_UPDATE_ALL_PROPS = '!'
const METADATA_INVALIDATE_CHILDREN = '&'


let varCounter = 0;

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
        node.context
        if (node.children.length) node.children.forEach(child => {replaceMapAliases(child)})
    }
    if (node.type === 'element') {
        Object.entries(node.props).map(([propName, propContent]) => {
            propContent ? propContent.value = propContent.value.replaceAll(MAP_INDEX_ALIAS, INDEX_PREFIX) : propContent
            propContent ? propContent.value = propContent.value.replaceAll(MAP_ITEM_ALIAS, ITEM_PREFIX) : propContent
            return {propName: propContent}
        })
        if (node.children.length) node.children.forEach(child => {replaceMapAliases(child)})
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

function applyRecursivly(node, effect) {
    effect(node)
    if (node.children && node.children.length) node.children.forEach(child => {applyRecursivly(child, effect)})
}


function preprocessingPipeline(tree) {
    // Define context on preprocessing
    tree.forEach(rootNode => {
        if (rootNode.type === 'component') {
            rootNode.elements.forEach(element => {applyRecursivly(element, (element) => {element.context = {}} )})
        }
    });

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

    // Group props by reactive & common
    tree.forEach(rootNode => {
        if (rootNode.type === 'component') {
            rootNode.elements.forEach(element => {groupProps(element)})
        }
    })

    // Undefine context after preprocessing
    tree.forEach(rootNode => {
        if (rootNode.type === 'component') {
            rootNode.elements.forEach(element => {applyRecursivly(element, (element) => {delete element.context} )})
        }
    });

    console.dir(tree, { depth: null });
}

preprocessingPipeline(test)