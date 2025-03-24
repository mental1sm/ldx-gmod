LiberDom = {}
LiberDom.__index = LiberDom

function LiberDom.init()
    local self = setmetatable({}, LiberDom)

    self.nodes = {}
    self.states = {}
    self.subscribtions = {}
    self.unsubscriptions = {}
    self.reactiveDeps = {}
    self.locked = true

    return self
end

function LiberDom:pushState(state, key)
    if self.subscriptions[key] ~= nil then return end
    self.subscriptions[key] = state
    self.unsubscriptions[key] = state.subscribe(state, function (_state)
        LiberDom:handleSubscription(state, key)
    end)
end

function LiberDom:extractState(key)
    return self.su
end

function LiberDom:handleSubscription(updatedState, key)
    for _key, value in pairs(self.reactiveDeps) do
        if _key == key then
            for _, sub in pairs(value) do
                
            end
        end
    end
end