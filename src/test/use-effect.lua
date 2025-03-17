function useEffect(callback, dependencies)
    local lastValues = {}

    for i, dep in ipairs(dependencies) do
        lastValues[i] = dep.value
    end

    local cleanup = callback()

    for i, dep in ipairs(dependencies) do
        dep.subscribe({
            __Update__ = function()
                if dep.value ~= lastValues[i] then
                    if cleanup then cleanup() end
                    cleanup = callback()
                    lastValues[i] = dep.value
                end
            end
        })
    end
end
