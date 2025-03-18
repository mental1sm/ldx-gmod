if SERVER then
    AddCSLuaFile()
end

function useState(initialValue)
    local state = { value = initialValue, subscribers = {} }

    function state.setState(newValue)
        if type(newValue) == "function" then
            newValue = newValue(state.value)
        end
        state.value = newValue

        for _, callback in pairs(state.subscribers) do
            if callback then
                callback(state)
            end
        end
    end

    function state.subscribe(callback)
        local index = #state.subscribers + 1
        state.subscribers[index] = callback

        return function()
            state.subscribers[index] = nil
        end
    end

    return state
end


function useEffect(callback, dependencies)
    local lastValues = {}
    local cleanup = nil
    local isMounted = false
    
    for i, dep in ipairs(dependencies) do
        lastValues[i] = dep.value
    end

    local function runEffect()
        local shouldRun = not isMounted
        if not shouldRun then
            for i, dep in ipairs(dependencies) do
                if dep.value ~= lastValues[i] then
                    shouldRun = true
                    break
                end
            end
        end

        if shouldRun then
            if cleanup then
                cleanup()
                cleanup = nil
            end
            
            local result = callback()
            if type(result) == "function" then
                cleanup = result
            end
            
            for i, dep in ipairs(dependencies) do
                lastValues[i] = dep.value
            end
            isMounted = true
        end
        
        return cleanup
    end

    for i, dep in ipairs(dependencies) do
        dep.subscribe(function()
            runEffect()
        end)
    end

    return runEffect
end




function useReducer(reducer, initialState)
    local state = useState(initialState)

    local function dispatch(action)
        state.setState(reducer(state.value, action))
    end

    return state, dispatch
end



function createStore(createStoreFn)
    local subscribers = {}
    local state = {}

    local function notify()
        for _, callback in pairs(subscribers) do
            callback(state)
        end
    end

    local function set(partialState)
        if type(partialState) == "function" then
            partialState = partialState(state)
        end
        for k, v in pairs(partialState) do
            state[k] = v
        end
        notify()
    end

    local store = createStoreFn(set)

    local proxy = setmetatable({}, {
        __index = function(_, k)
            return state[k]
        end,
        __newindex = function(_, k, v)
            state[k] = v
            notify()
        end
    })

    for k, v in pairs(store) do
        proxy[k] = v
    end

    local function subscribe(callback)
        local index = #subscribers + 1
        subscribers[index] = callback

        return function()
            subscribers[index] = nil
        end
    end

    return proxy, subscribe
end



function useMemo(computedFn, dependencies)
    local memoizedValue = useState(nil)
    local prevDeps = useState({})
    local subscribers = {}
    local unsubFunctions = {}

    local function setMemoizedValue()
        local hasChanged = false
        local currentDepValues = {}

        for i, dep in ipairs(dependencies) do
            currentDepValues[i] = dep.value
        end

        for i, depValue in ipairs(currentDepValues) do
            if depValue ~= prevDeps.value[i] then
                hasChanged = true
                break
            end
        end

        if hasChanged then
            local newValue = computedFn()
            memoizedValue.setState(newValue)
            prevDeps.setState(currentDepValues)

            for _, sub in ipairs(subscribers) do
                sub(newValue)
            end
        end
    end

    for _, dep in ipairs(dependencies) do
        local unsub = dep.subscribe(function()
            setMemoizedValue()
        end)
        table.insert(unsubFunctions, unsub)
    end

    setMemoizedValue()

    local function subscribe(callback)
        local index = #subscribers + 1
        subscribers[index] = callback

        return function()
            subscribers[index] = nil
        end
    end

    return {
        value = memoizedValue.value,
        subscribe = subscribe
    }
end


function useMemoizedCallback(callbackFn, dependencies)
    local memoizedResult = useState(nil)
    local prevArgs = useState({})
    local prevDeps = useState({})

    local function updateMemoized()
        local hasDepsChanged = false
        local currentDeps = {}

        for i, dep in ipairs(dependencies) do
            currentDeps[i] = dep.value
        end

        for i, depValue in ipairs(currentDeps) do
            if depValue ~= prevDeps.value[i] then
                hasDepsChanged = true
                break
            end
        end

        if hasDepsChanged then
            prevDeps.setState(currentDeps)
            memoizedResult.setState(nil)
        end
    end

    for _, dep in ipairs(dependencies) do
        dep.subscribe(function()
            updateMemoized()
        end)
    end

    updateMemoized()

    return function(...)
        local args = {...}
        local argsKey = table.concat(args, ":")

        local argsChanged = false
        for i, arg in ipairs(args) do
            if arg ~= prevArgs.value[i] then
                argsChanged = true
                break
            end
        end

        if memoizedResult.value == nil or argsChanged then
            local result = callbackFn(...)
            memoizedResult.setState(result)
            prevArgs.setState(args)
        end

        return memoizedResult.value
    end
end