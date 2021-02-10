# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
"""
CallFlow's algorithm to differentiate two given CCTs.
"""
from math import sqrt
import networkx as nx
from numpy import square, trace, amax
from scipy.sparse import identity
from scipy.sparse import diags


class DLcon_Similarity:
    """
    DeltaCon similarity
    Refer the paper DELTACON: A Principled Massive-Graph Similarity Function
    https://arxiv.org/abs/1304.4657
    """

    def __init__(self, g1, g2):
        """

        :param g1: NetworkX graph 1
        :param g2: NetworkX graph 2
        """

        nxg_e = nx.DiGraph()
        nxg_e.add_nodes_from(g1)
        nxg_e.add_nodes_from(g2)

        nxg_1 = nx.DiGraph()
        nxg_1.add_nodes_from(nxg_e)
        nxg_1.add_edges_from(g1.edges())
        nxg_2 = nx.DiGraph()
        nxg_2.add_nodes_from(nxg_e)
        nxg_2.add_edges_from(g2.edges())

        adj_1 = nx.adjacency_matrix(nxg_1)
        adj_2 = nx.adjacency_matrix(nxg_2)

        self.result = self.compute(adj_1, adj_2)

    def InverseMatrix(self, A):
        """
        Calculate the inverse matrix of the adjacency matrix.

        :param A: Adjacency matrix
        :return: inverted matrix
        """
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

    def compute(self, A1, A2):
        """
        Compare the adjacency matrixes and find similarity

        :param A1: Adjacency matrix for graph 1
        :param A2: Adjacency matrix for graph 2
        :return: similarity (0 < x < 1)
        """
        S1 = self.InverseMatrix(A1)
        S2 = self.InverseMatrix(A2)
        d = 0
        for i in range(A1.shape[0]):
            for j in range(A1.shape[0]):
                d += (sqrt(S1.tocsr()[(i, j)]) - sqrt(S2.tocsr()[(i, j)])) ** 2
        d = sqrt(d)
        sim = 1 / (1 + d)
        return 1 - sim
