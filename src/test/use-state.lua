function useState(initialValue)
    local value = initialValue
    local subscribers = {}
    return {
        value = value,
        setState = function(callback)
            value = callback(value)
            for _, sub in pairs(subscribers) do
                sub:UpdateProps()
            end
        end,
        subscribe = function(sub) table.insert(subscribers, sub) end
    }
end