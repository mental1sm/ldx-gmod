function useState(initialValue)
    local state = { value = initialValue, subscribers = setmetatable({}, { __mode = "v" }) }

    function state.setState(newValue)
        if type(newValue) == "function" then
            newValue = newValue(state.value)
        end
        state.value = newValue

        for _, sub in pairs(state.subscribers) do
            if sub then
                sub:__Update__(state)
            end
        end
    end

    function state.subscribe(obj)
        table.insert(state.subscribers, obj)
    end

    return state
end
