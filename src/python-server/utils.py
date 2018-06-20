# Input : ./xxx/xxx/yyy
# Output: yyy
def sanitizeName(self, name):
    if name == None:
        return None
    name_split = name.split('/')
    return name_split[len(name_split) - 1]  
    
