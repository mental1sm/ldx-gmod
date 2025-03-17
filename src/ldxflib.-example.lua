local filterStore = createStore(function (set)
    return {
        filters = {},
        setFilters = function (newFilters)
            set(function ()
                return {filters = newFilters}
            end)
        end,
        resetFilters = function ()
            set(function ()
                return {filters = {}}
            end)
        end
    }
end)


-- Пример использования
local test = useState("666")

local myCallback = useMemoizedCallback(function(x) 
    print("Callback called with: " .. tostring(x) .. ", test value: " .. test.value)
    return test.value .. " + " .. tostring(x)
end, {test})

print("Result: " .. myCallback("abc"))
print("Result: " .. myCallback("abc")) -- Не вызовет функцию повторно
print("Result: " .. myCallback("def")) -- Вызовет, так как аргумент изменился)

test.setState("123")
print("Result: " .. myCallback("abc")) -- Вызовет, так как зависимость изменилась)


local test = useState("123")

local getHeavyResult = useMemo(function()
    print("Результат вычислений для", test)
end, {test})

getHeavyResult.subscribe(function(newValue)
    print("Подписчик получил новое значение:", newValue)
end)

test.setState("456")