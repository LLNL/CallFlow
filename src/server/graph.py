class Graph():
    def __init__(self):
        self.nodes = []
        self.edges = []
        self.adj_list = {}

    def add_node(self, node):
        self.nodes.append(node)

    def add_edge(self, source, target):
        if source not in self.adj_list:
            self.adj_list[source] = []
        self.adj_list[source].append(target)

    def print_adj_list(self):
        for idx, elem  in enumerate(self.adj_list):
            print(elem, self.adj_list[elem])
            
    

if __name__ == "__main__":
    g = Graph()
    g.add_node(1)
    g.add_node(2)
    g.add_edge(1, 2)
    g.print_adj_list()
