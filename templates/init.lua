-- AuraHub Initialization Script
-- This is the initial loader that users run

local function getLoader()
    local LoaderID = "{{LOADER_ID}}"
    local Version = "{{VERSION}}"
    local CDNUrl = "{{CDN_URL}}"

    local url = string.format("%s/init/%s.lua", CDNUrl, LoaderID)
    
    local success, response = pcall(function()
        return game:HttpGet(url)
    end)

    if success and response then
        local loadSuccess, script = pcall(function()
            return loadstring(response)
        end)
        
        if loadSuccess and script then
            return script
        end
    end
    
    return nil
end

local loader = getLoader()
if loader then
    loader()
else
    warn("Failed to initialize loader")
    print("Please check your internet connection and try again.")
end