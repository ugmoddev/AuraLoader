-- AuraHub Loader Template
-- This is the loader that gets distributed to users

local LoaderID = "{{LOADER_ID}}"
local Version = "{{VERSION}}"
local Secret = "{{SECRET}}"
local CDNUrl = "{{CDN_URL}}"

-- Check if we're in a valid environment
local function validateEnvironment()
    local success, result = pcall(function()
        return game:GetService("Players")
    end)
    return success
end

-- Main loader function
local function loadScript()
    if not validateEnvironment() then
        warn("Invalid environment")
        return
    end

    local hwid = tostring(game.Players.LocalPlayer)
    local url = string.format("%s/init/%s.lua?hwid=%s&secret=%s", 
        CDNUrl, LoaderID, hwid, Secret)

    local success, result = pcall(function()
        return game:HttpGet(url)
    end)

    if success and result then
        local loadSuccess, script = pcall(function()
            return loadstring(result)
        end)
        
        if loadSuccess and script then
            script()
        else
            warn("Failed to execute script")
        end
    else
        warn("Failed to fetch script: " .. tostring(result))
    end
end

-- Execute
loadScript()