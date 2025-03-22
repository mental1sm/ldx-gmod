if SERVER then
    AddCSLuaFile()
    return
end

// Move subscribers out of state to avoid access to subscribers
function useState(initialValue)
    local state = { value = initialValue, subscribers = {} }

    function state.setState(newValue)
        if type(newValue) == "function" then
            newValue = newValue(state.value)
        end
        state.value = newValue

        for _, subscriber in pairs(state.subscribers) do
            local isOkay = true

            if subscriber.strict and subscriber.isValid then
                isOkay = subscriber.isValid()
            end

            if isOkay then
                local success, err = pcall(function () subscriber.callback(state) end)
                if not success then
                    print('[LDX] state callback error:', err)
                end
            else
                state.subscribers[_] = nil
            end
        end
    end

    function state.subscribe(callback, strict, validCallback)
        state.subscribers[callback] = {callback = callback, strict = strict, isValid = validCallback}

        return function()
            state.subscribers[callback] = nil
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
                local success, err = pcall(cleanup)
                if not success then
                    print('[LDX} Cleanup error', err)
                end
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

    for _, dep in ipairs(dependencies) do
        dep.subscribe(function()
            runEffect()
        end)
    end

    return runEffect
end




function useReducer(reducer, initialArg, initFn)
    local initialState = initFn and initFn(initialArg) or initialArg
    local state = useState(initialState)

    local function dispatch(action)
        local prevState = state.value
        local nextState

        local success, result = pcall(function()
            return reducer(prevState, action)
        end)

        if success then
            nextState = result
        else
            print('[LDX] useReducer reducer error:', result)
            return
        end

        -- shallow equality check
        if nextState ~= prevState then
            state.setState(nextState)
        end
    end

    return state, dispatch
end




function createStore(createStoreFn)
    local state = {}
    local subscribers = {}

    local function notify()
        for key, subscriber in pairs(subscribers) do
            local isOkay = true

            if subscriber.strict and subscriber.isValid then
                isOkay = subscriber.isValid()
            end

            if isOkay then
                local success, err = pcall(function()
                    subscriber.callback(state)
                end)

                if not success then
                    print("[LDX] store subscriber error:", err)
                end
            else
                subscribers[key] = nil
            end
        end
    end

    local function set(partialState)
        if type(partialState) == "function" then
            partialState = partialState(state)
        end

        local changed = false
        for k, v in pairs(partialState) do
            if state[k] ~= v then
                state[k] = v
                changed = true
            end
        end

        if changed then
            notify()
        end
    end

    local store = createStoreFn(set)

    local proxy = setmetatable({}, {
        __index = function(_, k)
            return state[k]
        end,
        __newindex = function(_, k, v)
            if state[k] ~= v then
                state[k] = v
                notify()
            end
        end
    })

    for k, v in pairs(store) do
        proxy[k] = v
    end

    local function subscribe(callback, strict, isValid)
        local key = {}
        subscribers[key] = {
            callback = callback,
            strict = strict,
            isValid = isValid
        }

        return function()
            subscribers[key] = nil
        end
    end

    return proxy, subscribe
end

function useStore(store, key, panel)
    local state = useState(store[key])

    local function callback(newStore)
        local newValue = newStore[key]
        if newValue ~= state.value then
            state.setState(newValue)
        end
    end

    local unsub = nil
    if panel then
        unsub = store.subscribe(callback, true, function()
            return IsValid(panel)
        end)
    else 
        unsub = store.subscribe(callback)
    end

    return state, unsub
end



function useMemo(computedFn, dependencies)
    local memoizedValue = useState(nil)
    local lastDepValues = {}

    local function updateMemo()
        local shouldUpdate = false
        local currentValues = {}

        for i, dep in ipairs(dependencies) do
            currentValues[i] = dep.value
            if dep.value ~= lastDepValues[i] then
                shouldUpdate = true
            end
        end

        if shouldUpdate then
            local success, result = pcall(computedFn)
            if success then
                memoizedValue.setState(result)
                for i, v in ipairs(currentValues) do
                    lastDepValues[i] = v
                end
            else
                print("[LDX] useMemo error:", result)
            end
        end
    end

    for _, dep in ipairs(dependencies) do
        dep.subscribe(function()
            updateMemo()
        end)
    end

    updateMemo()

    return {
        value = memoizedValue.value,
        subscribe = function(cb, strict, validationCallback)
            return memoizedValue.subscribe(cb, strict, validationCallback)
        end
    }
end



function useComputedFn(callbackFn, dependencies)
    local lastDeps = {}
    local lastArgs = {}
    local cachedResult = nil

    local function depsChanged()
        for i, dep in ipairs(dependencies) do
            if dep.value ~= lastDeps[i] then
                return true
            end
        end
        return false
    end

    for i, dep in ipairs(dependencies) do
        lastDeps[i] = dep.value
        dep.subscribe(function()
            cachedResult = nil
        end)
    end

    return function(...)
        local args = {...}
        local argsChanged = false

        for i = 1, #args do
            if args[i] ~= lastArgs[i] then
                argsChanged = true
                break
            end
        end

        if cachedResult == nil or depsChanged() or argsChanged then
            local success, result = pcall(function()
                return callbackFn(unpack(args))
            end)

            if success then
                cachedResult = result
                for i = 1, #args do
                    lastArgs[i] = args[i]
                end
                for i = 1, #dependencies do
                    lastDeps[i] = dependencies[i].value
                end
            else
                print("[LDX] useComputedFn error:", result)
            end
        end

        return cachedResult
    end
end



local function deepEqual(a, b, visited)
    if a == b then return true end

    if type(a) ~= type(b) then return false end
    if type(a) ~= "table" then return false end

    visited = visited or {}

    if visited[a] and visited[a] == b then
        return true
    end

    visited[a] = b

    for k, v in pairs(a) do
        if not deepEqual(v, b[k], visited) then
            return false
        end
    end

    for k, v in pairs(b) do
        if a[k] == nil then
            return false
        end
    end

    return true
end


local function calculateDelta(prev, curr)
    local stateChanged = {}
    local deleted = {}
    local inserted = {}

    for key, value in pairs(prev) do
        if curr[key] == nil then
            table.insert(deleted, key)
        elseif not deepEqual(curr[key], value) then
            table.insert(stateChanged, key)
        end
    end

    for key, value in pairs(curr) do
        if prev[key] == nil then
            table.insert(inserted, {[key] = value})
        end
    end

    return {
        stateChanged = stateChanged,
        delete = deleted,
        insert = inserted
    }
end
