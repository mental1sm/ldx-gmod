include('../modules/ldxflib')

local users = {
    {name = 'amanda', age = 18},
    {name = 'johhan', age = 14},
    {name = 'sue', age = 25}
}
local rusers = useState(users)

local prev = table.shallow_copy(rusers.value)
print(prev)
users[1].age = 1488
rusers.setState(function (prevVal)
    prevVal[1].age = 1488
    return prevVal
end)
print(rusers.value)

local delta = calculateDelta(prev, rusers.value)
