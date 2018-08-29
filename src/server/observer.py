class Boss(object):
    """ 
    Maintains a list of observers and notifies them
    when a state changes
    """
    
    def __init__(self):
        self.__dict__['state'] = 0
        self.__dict__['observers'] = []

    def __setattr__(self, name, value):
        self.__dict__[name] = value
        if name == 'state':
            self.notify_observers()

    def register(self, observer):
        if observer not in self.observers:
            self.observers.append(observer)

    def unregister(self, observer):
        self.observers.remove(observer)

    def notify_observers(self):
        """
        Call update method on all the observers
        """        
        for observer in self.observers:
            observer.update()
        
