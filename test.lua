--[===[
fsddsfsdfsdfsf
--]===]

---[[
print 'Lua is love'
--[=[]]
--print 'Lua is life'
--]=]

--[[
--print 'Lua is love'
--[=[]]
print 'Lua is life'
--]=]

--bbb {1}

--aaa(1, 2, 3, 2, b())

-- a = c(1) + 2 * 3
-- c(1) 2 3 * +
--a = 'alo\\n123"'
--a = "alo\\n123\""
--a = '\\97lo\\10\\04923"'
--a = [[alo
--123"]]
--a = [==[
--alo
--123"]==]

--i = 3
--i, a[i] = i+1, 20
--a[i]=2*3*1
--print(1*2+3)
--a=1*2*3
---[[
b = #'1'
function c(printer)
    return printer
end
--]]
a = b + (c(print or io.write)('marcoantoniorahalsacoman') or 0)
--]]
---[[
function factorial(n)
  local x = 1
  for i = 2, n, 1 do
    x = x * i
  end
  return x
end
--]]

--a = { [f(1)] = g; "x", "y"; x = 1, f(x), [30] = 23; 45 }
--print(b())
--print(1)
a = 1 * 2 + factorial(1)
print(a)

print(factorial(4))

x = 10                    -- global variable
do                        -- new block
    local x = x           -- new 'x', with value 10
    print(x)              --> 10
    x = x + 1
    do                    -- another block
        local x = x + 1   -- another 'x'
        print(x)          --> 12
    end
    print(x)              --> 11
end
print(x)                  --> 10  (the global one)
print 'asasdasd'
print {}
---[[
a = {}
local x = 20
for i = 1, 10 do
    --l = function () end
    local y = 0
    a[i] = function ()
        y = y + 1;
        return x + y
    end
end
print(print(a))
if a[1] then
    print(a[1]())
    print(a[2]())
end

repeat
    local a = true
    print('a')
until a
--]]

--[[
    print(
        factorial(
            1
        )
    )

    functioncall {
        prefixexp: {
            var: "print"
        }
        args: {
            functioncall {
                prefixexp: {
                    var: "factorial",
                }
                args: {
                    exp: 1
                }
            }
        }
    }
--]]
--1
