function useState(initialValue)
    local state = { value = initialValue, subscribers = setmetatable({}, { __mode = "v" }) }

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
        table.insert(state.subscribers, callback)
    end

    return state
end



function useReducer(reducer, initialState)
    local state = useState(initialState)

    local function dispatch(action)
        state.setState(reducer(state.value, action))
    end

    return state, dispatch
end



function createStore(createStoreFn)
    local state = useState({})

    local function setState(fnOrNewState)
        local newState = nil
        if type(fnOrNewState) == "function" then
            newState = fnOrNewState(state.value)
        else
            newState = fnOrNewState
        end
        state.setState(newState)
    end

    local store = createStoreFn(setState)

    return store, state
end


function useMemo(computedFn, dependencies)
    local memoizedValue = useState(nil)
    local prevDeps = useState({})
    local subscribers = {}

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
        dep.subscribe(function()
            setMemoizedValue()
        end)
    end

    setMemoizedValue()

    local function subscribe(sub)
        table.insert(subscribers, sub)
        sub(memoizedValue.value)
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