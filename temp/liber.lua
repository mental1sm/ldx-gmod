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
  
  function LiberDom:addNode(class, props)
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
    local counter = useState(0)

    local frameId = LiberDom:addNode("DFrame", {
    size = {300, 100},
    pos = {200, 200},
    title = "Тестовая форма"
    })

    LiberDom:addNode("DLabel", {
    parent = frameId,
    pos = {20, 40},
    text = function()
        return "Счётчик: " .. counter:get()
    end
    })

    timer.Create("Bump", 1, 10, function()
    counter:set(counter:get() + 1)
    end)
end

concommand.Add("open_ui4", function()
    CreateMenu()
end)
