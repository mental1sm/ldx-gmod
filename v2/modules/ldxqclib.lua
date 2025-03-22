if SERVER then
    AddCSLuaFile()
    return
end
include('ldxflib')

GlobalQueryCahce = {}

function useQuery(options)
    assert(options and options.queryKey and options.queryFn, "[LDX] useQuery: need to define queryKey and queryFn")

    local key = table.concat(options.queryKey, "::")
    local queryFn = options.queryFn
    local staleTime = options.staleTime or 30

    if GlobalQueryCahce[key] then
        local entry = GlobalQueryCahce[key]
        local currentTime = os.time()
        if currentTime - entry.timestamp < staleTime then
            return entry.isFetching, entry.isFetched, entry.data
        end
    end

    local isFetching = useState(true)
    local isFetched = useState(false)
    local data = useState(nil)

    GlobalQueryCahce[key] = {
        queryFn = queryFn,
        isFetching = isFetching,
        isFetched = isFetched,
        data = data,
        timestamp = 0
    }

    return function()
        isFetching.setState(true)
        isFetched.setState(false)

        local cancelled = false

        local function fetch()
            local success, result = pcall(queryFn)
            if success and not cancelled then
                data.setState(result)
                isFetched.setState(true)
                GlobalQueryCahce[key].timestamp = os.time()
            elseif not success then
                print("[LDX] useQuery error:", result)
            end
            if not cancelled then
                isFetching.setState(false)
            end
        end

        fetch()

        -- Cleanup
        return function()
            cancelled = true
        end
    end,
    isFetching,
    isFetched,
    data

end


function invalidateQuery(queryKey)
    local key = table.concat(queryKey, "::")
    local entry = GlobalQueryCahce[key]

    if not entry then
        print("[LDX] invalidateQuery: No such query registered for key:", key)
        return
    end

    entry.timestamp = 0

    local queryFn = entry.queryFn
    local isFetching = entry.isFetching
    local isFetched = entry.isFetched
    local data = entry.data

    isFetching.setState(true)
    isFetched.setState(false)

    local success, result = pcall(queryFn)
    if success then
        data.setState(result)
        isFetched.setState(true)
        entry.timestamp = os.time()
    else
        print("[LDX] invalidateQuery fetch error:", result)
    end

    isFetching.setState(false)
end
