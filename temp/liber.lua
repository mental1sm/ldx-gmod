LiberDom = {
    nodes = {},
    idCounter = 0,
    CURRENT_COLLECTOR = nil
  }
  
  function useState(default)
    local state = {
      value = default,
      subscribers = {},
  
      get = function(self)
        if LiberDom.CURRENT_COLLECTOR then
          table.insert(self.subscribers, LiberDom.CURRENT_COLLECTOR)
        end
        return self.value
      end,
  
      set = function(self, newValue)
        self.value = newValue
        for _, node in ipairs(self.subscribers) do
          node:update()
        end
      end
    }
  
    return state
  end
  
  -- Новый хелпер для применения пропсов
  local function applyProps(vguiObj, props)
    for key, value in pairs(props) do
      if key ~= "parent" and key ~= "children" then
        local setter = vguiObj["Set" .. key:gsub("^%l", string.upper)]
        if isfunction(setter) and type(value) ~= "function" then
          setter(vguiObj, value)
        end
      end
    end
  end
  
  function LiberDom:addNode(id, parentId, class, props)
    self.idCounter = self.idCounter + 1
    local id = self.idCounter
  
    local node = {
      id = id,
      class = class,
      props = props or {},
      vguiObject = vgui.Create(class),
      update = function(self)
        LiberDom.CURRENT_COLLECTOR = self
        for key, val in pairs(self.props) do
          if type(val) == "function" then
            local result = val()
            local setter = self.vguiObject["Set" .. key:gsub("^%l", string.upper)]
            if isfunction(setter) then
              setter(self.vguiObject, result)
            end
          end
        end
        LiberDom.CURRENT_COLLECTOR = nil
      end
    }
  
    if props.parent then
      node.vguiObject:SetParent(self.nodes[props.parent].vguiObject)
    end
  
    applyProps(node.vguiObject, props)
    node:update()
  
    self.nodes[id] = node
    return id
  end



function CreateMenu()
    local DOM = LiberDom.init()
    local counter = useState(0)
    DOM.pushState("counter", counter)

    DOM:addNode("node1", nil, function (parent)
      local _ = vgui.Create("DFrame", nil)
      _:SetSize(500, 700)
      _:MakePopup()
      _:SetPos(0, 0)
      _:SetTitle("")
      _:SetDraggable(false)
    end, {})

    DOM:addNode("node2", "node1", function (parent)
      local _ = vgui.Create("DLabel", parent)
      _:Dock(FILL)
      _:SetPos(100, 200)
    end, {
      {fn = "SetText", fnType = "classMethod", args = function (counter) return "Счетчик: " .. counter.value end, dep = "counter"}
    })

    DOM:render()
    DOM:lock()

    local counterRef = DOM:getState("counter")
    local rootNode = DOM:findNode("node1")

    timer.Create("Bump", 1, 10, function()
    counter:set(counter:get() + 1)
    end)

    {fn = "SetText", fnType = "classMethod", args = function (text1) return "Текст: " .. text1.value .. text2.value end, dep = "text1"},
    {fn = "SetText", fnType = "classMethod", args = function (text2) return "Текст: " .. text1.value .. text2.value end, dep = "text2"}
end

concommand.Add("open_ui4", function()
    CreateMenu()
end)
