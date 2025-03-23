include('ldxflib.lua')
if SERVER then
    AddCSLuaFile()
end

function TestMenu(LDX_INPUT_ARGS, PARENT)
    __UNSB__ = {}
    local counter = useState(0)
    local users = useState({})

    local _0 = vgui.Create("DFrame", PARENT)
    _0:SetSize(500, 700)
    _0:MakePopup()
    _0:SetPos(0, 0)
    _0:SetTitle("")
    _0:SetDraggable(false)
    __mvs__2 = {}
    for __, user in pairs({0,0,0}) do
        __mvs__2[user.name] = vgui.Create("DLabel", _0)
        __mvs__2[user.name]:SetPos(150 * 0.5 * _0, 40)
        __mvs__2[user.name]:SetSize(200, 100)
        __mvs__2[user.name]:SizeToContents()
        __mvs__2[user.name].__update__counter = function(counter)
            __mvs__2[user.name]:SetText(counter.value)
        end
        __UNSB__["__unsb____mvs__2[__]_counter" .. user.name] = counter.subscribe(function(state)
            __mvs__2[user.name]:__update__counter(state)
        end, true,
        function()
            return IsValid(__mvs__2[user.name])
        end)

    end
    _0.OnRemove = function(self)

        for _, _u in pairs(__UNSB__) do
            _u()
        end

    end
end

concommand.Add("open_ui3", function()
    TestMenu()
end)

