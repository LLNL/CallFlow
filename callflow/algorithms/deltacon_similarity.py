# *******************************************************************************
# * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
# * Produced at the Lawrence Livermore National Laboratory.
# *
# * Written by Suraj Kesavan <htpnguyen@ucdavis.edu>.
# *
# * LLNL-CODE-740862. All rights reserved.
# *
# * This file is part of CallFlow. For details, see:
# * https://github.com/LLNL/CallFlow
# * Please also read the LICENSE file for the MIT License notice.
# ******************************************************************************
from numpy import square, trace, amax
from math import sqrt
import networkx as nx
from scipy.sparse import identity
from scipy.sparse import diags


class DeltaConSimilarity:
    def __init__(self, g1, g2):
        self.R = nx.DiGraph()
        self.R.add_nodes_from(g1)
        self.R.add_nodes_from(g2)
        self.R1 = nx.DiGraph()
        self.R1.add_nodes_from(self.R)
        self.R1.add_edges_from(g1.edges())
        self.R2 = nx.DiGraph()
        self.R2.add_nodes_from(self.R)
        self.R2.add_edges_from(g2.edges())
        A1 = nx.adjacency_matrix(self.R1)
        A2 = nx.adjacency_matrix(self.R2)
        self.result = self.run(A1, A2)

    def InverseMatrix(self, A):
        D = diags(sum(A).toarray(), [0])
        c1 = trace(D.toarray()) + 2
        c2 = trace(square(D).toarray()) - 1

        h_h = sqrt((-c1 + sqrt(c1 * c1 + 4 * c2)) / (8 * c2))
        a = 4 * h_h * h_h / (1 - 4 * h_h * h_h)
        c = 2 * h_h / (1 - 4 * h_h * h_h)
        M = c * A - a * D

        S = identity(A.shape[0])
        mat = M
        power = 1
        while amax(M.toarray()) > 1e-09:
            if power < 7:
                S = S + mat
                mat = mat * M
                power += 1
            else:
                break
        return S

    def run(self, A1, A2):
        S1 = self.InverseMatrix(A1)
        S2 = self.InverseMatrix(A2)
        d = 0
        for i in range(A1.shape[0]):
            for j in range(A1.shape[0]):
                d += (sqrt(S1.tocsr()[(i, j)]) - sqrt(S2.tocsr()[(i, j)])) ** 2
        # print("d: ", d)
        d = sqrt(d)
        sim = 1 / (1 + d)
        return 1 - sim
