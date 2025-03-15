local elem0 = vgui.Create("DFrame")
elem0:SetSize(700, 500)
local elem1 = vgui.Create("DButton", elem0)
elem1:SetSize(PARENT:GetTall() * 0.5, 0)
elem1:SetText("Привет")
elem1.DoClick = function() print("Привет!") end
