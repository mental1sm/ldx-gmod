include('../modules/ldxflib')

local initial = {
    {name = 'amanda', age = 18},
    {name = 'johhan', age = 14},
    {name = 'sue', age = 25}
}
local users = useState(initial)
__mvs__2 = {}
__mvs__2["INTERNAL_LAST_VALUE"] = table.deep_copy(users.value)

local render = function (index, item)
    __mvs__2[index] = vgui.Create("DLabel", _0)
    __mvs__2[index]:SizeToContents()
    __mvs__2[index].__update__users = function(state)
        __mvs__2[index]:SetText(state.value[index].name)
        __mvs__2[index]:SetText(state.value[index].age)
    end
end

for index, item in pairs(users.value) do
    render(index, item, index)
end


local _r_mvs_2 = function(state)
    local delta = calculateDelta(__mvs__2["INTERNAL_LAST_VALUE"], state.value)
    
    local rerender = function (state)
        __mvs__2["INTERNAL_LAST_VALUE"] = table.deep_copy(users.value)
        for index, item in pairs(state.value) do
            __mvs__2[index]:Remove()
        end
        for index, item in pairs(state.value) do
            render(index, item)
        end
    end

    if #delta.delete > 0 then 
        rerender(state)
    elseif #delta.insert > 0 then 
        rerender(state)
    else
        for _, realIndex in ipairs(delta.stateChanged) do
            if __mvs__2[realIndex] then
                __mvs__2[realIndex]:__update__users(users)
            end
        end
        
    end
end

__UNSB__["__mvs__2_users"] = users.subscribe(function(state)
    _r_mvs_2(state)
end, true, function () return IsValid(_0) end)