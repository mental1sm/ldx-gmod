const G = require('../global')
/**
 * One of the important part of context - Internal functions
 * @pushNodeToParentChildrenSectionBegin Called from SomeNode and inserts NewNode to SomeNode.ParentNode start
 * @pushNodeToParentChildrenSectionEnd Called from SomeNode and inserts NewNode to SomeNode.ParentNode end
 * @pushNodeBeforeThisNode ...
 * @pushNodeAfterThisNode ...
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
      newNode.context = {...G.DEFAULT_CONTEXT, ...child.context}
      parent.children = [newNode, ...parent.children]
      return newNode
    }
    child.context.pushNodeToParentChildrenSectionEnd = (newNode) => {
      newNode.context = {...G.DEFAULT_CONTEXT, ...child.context}
      parent.children = [...parent.children, newNode]
      return newNode
    }
    child.context.pushNodeBeforeThisNode = (newNode) => {
      newNode.context = {...G.DEFAULT_CONTEXT, ...child.context}
      const index = parent.children.indexOf(child);
      if (index !== -1) {
        parent.children.splice(index, 0, newNode);
      }
      return newNode
    }
    child.context.pushNodeAfterThisNode = (newNode) => {
      newNode.context = {...G.DEFAULT_CONTEXT, ...child.context}
      const index = parent.children.indexOf(child);
      if (index !== -1) {
        parent.children.splice(index + 1, 0, newNode);
      }
      return newNode
    }
    child.context.wrapSelfWithNode = (newNode) => {
      newNode.context = {...G.DEFAULT_CONTEXT, ...child.context}
      const index = parent.children.indexOf(child);
      if (index === -1) return;
  
      const nodeClone = { ...child, context: { ...child.context } };
  
      parent.children[index] = newNode;
      attachInternalFunctionsToNode(parent, newNode)
      attachInternalFunctionsToNode(newNode, nodeClone)
      newNode.children = [nodeClone]
      return newNode
    }
    child.context.wrapSelfGroupWithNode = (newNode) => {
      newNode.context = {...G.DEFAULT_CONTEXT, ...child.context}
      const childrenClone = [...parent.children]
  
  
      attachInternalFunctionsToNode(parent, newNode)
      parent.children = [newNode]
      childrenClone.forEach(clone => {attachInternalFunctionsToNode(newNode, clone)})
      newNode.children = childrenClone
      return newNode
    }
  }
  
  // Need to init default context for all nodes in AST
  function initContext(node) {
    if (!node.context) node.context = {...G.DEFAULT_CONTEXT}
    if (node.children) {
      node.children.forEach(child => {
        if (!child.context) child.context = {...G.DEFAULT_CONTEXT}
        attachInternalFunctionsToNode(node, child)
        initContext(child)
      })
    }
  }

  module.exports = {
    initContext: initContext,
    attachInternalFunctionsToNode: attachInternalFunctionsToNode
  }