const EARLY = require('./early')
const MIDDLE = require('./middle')
const LATE = require('./late')

const preprocessingPipeline = (tree) => {
    EARLY.executeEarlyStage(tree)
    MIDDLE.executeMiddleStage(tree)
    LATE.executeLateStage(tree)
    return tree
}

module.exports = {
    preprocessingPipeline: preprocessingPipeline
}