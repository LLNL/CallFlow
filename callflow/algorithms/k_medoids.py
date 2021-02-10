# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
"""
CallFlow's algorithm to calculate kMediods.
"""
import random
import numpy as np
from scipy.sparse import csr_matrix


class KMedoids:
    """
    K-mediods calculation.
    """

    def __init__(
        self, n_cluster=2, max_iter=10, tol=0.1, start_prob=0.8, end_prob=0.99
    ):
        """Kmedoids constructor called"""
        if (
            start_prob < 0
            or start_prob >= 1
            or end_prob < 0
            or end_prob >= 1
            or start_prob > end_prob
        ):
            raise ValueError("Invalid input")
        self.n_cluster = n_cluster
        self.max_iter = max_iter
        self.tol = tol
        self.start_prob = start_prob
        self.end_prob = end_prob

        self.medoids = []
        self.clusters = {}
        self.tol_reached = float("inf")
        self.current_distance = 0

        self.__data = None
        self.__is_csr = None
        self.__rows = 0
        self.__columns = 0
        self.cluster_distances = {}

    def fit(self, data):
        """

        :param data:
        :return:
        """
        self.__data = data
        self.__set_data_type()
        self.__start_algo()
        return self

    def __start_algo(self):
        """

        :return:
        """
        self.__initialize_medoids()
        self.clusters, self.cluster_distances = self.__calculate_clusters(self.medoids)
        self.__update_clusters()

    def __update_clusters(self):
        """

        :return:
        """
        for i in range(self.max_iter):
            cluster_dist_with_new_medoids = self.__swap_and_recalculate_clusters()
            if self.__is_new_cluster_dist_small(cluster_dist_with_new_medoids):
                self.clusters, self.cluster_distances = self.__calculate_clusters(
                    self.medoids
                )
            else:
                break

    def __is_new_cluster_dist_small(self, cluster_dist_with_new_medoids):
        """

        :param cluster_dist_with_new_medoids:
        :return:
        """
        existance_dist = self.calculate_distance_of_clusters()
        new_dist = self.calculate_distance_of_clusters(cluster_dist_with_new_medoids)

        if existance_dist > new_dist and (existance_dist - new_dist) > self.tol:
            self.medoids = cluster_dist_with_new_medoids.keys()
            return True
        return False

    def calculate_distance_of_clusters(self, cluster_dist=None):
        """

        :param cluster_dist:
        :return:
        """
        if cluster_dist is None:
            cluster_dist = self.cluster_distances
        dist = 0
        for medoid in cluster_dist.keys():
            dist += cluster_dist[medoid]
        return dist

    def __swap_and_recalculate_clusters(self):
        """

        :return:
        """
        # http://www.math.le.ac.uk/people/ag153/homepage/KmeansKmedoids/Kmeans_Kmedoids.html
        cluster_dist = {}
        for medoid in self.medoids:
            is_shortest_medoid_found = False
            for data_index in self.clusters[medoid]:
                if data_index != medoid:
                    cluster_list = list(self.clusters[medoid])
                    cluster_list[self.clusters[medoid].index(data_index)] = medoid
                    new_distance = self.calculate_inter_cluster_distance(
                        data_index, cluster_list
                    )
                    if new_distance < self.cluster_distances[medoid]:
                        cluster_dist[data_index] = new_distance
                        is_shortest_medoid_found = True
                        break
            if not is_shortest_medoid_found:
                cluster_dist[medoid] = self.cluster_distances[medoid]
        return cluster_dist

    def calculate_inter_cluster_distance(self, medoid, cluster_list):
        """

        :param medoid:
        :param cluster_list:
        :return:
        """
        distance = 0
        for data_index in cluster_list:
            distance += self.__get_distance(medoid, data_index)
        return distance / len(cluster_list)

    def __calculate_clusters(self, medoids):
        """

        :param medoids:
        :return:
        """
        clusters = {}
        cluster_distances = {}
        for medoid in medoids:
            clusters[medoid] = []
            cluster_distances[medoid] = 0

        for row in range(self.__rows):
            nearest_medoid, nearest_distance = self.__get_shortest_distance_to_mediod(
                row, medoids
            )
            cluster_distances[nearest_medoid] += nearest_distance
            clusters[nearest_medoid].append(row)

        for medoid in medoids:
            cluster_distances[medoid] /= len(clusters[medoid])
        return clusters, cluster_distances

    def __get_shortest_distance_to_mediod(self, row_index, medoids):
        """

        :param row_index:
        :param medoids:
        :return:
        """
        min_distance = float("inf")
        current_medoid = None

        for medoid in medoids:
            current_distance = self.__get_distance(medoid, row_index)
            if current_distance < min_distance:
                min_distance = current_distance
                current_medoid = medoid
        return current_medoid, min_distance

    def __initialize_medoids(self):
        """

        :return:
        """
        """Kmeans++ initialisation"""
        self.medoids.append(random.randint(0, self.__rows - 1))
        while len(self.medoids) != self.n_cluster:
            self.medoids.append(self.__find_distant_medoid())

    def __find_distant_medoid(self):
        """

        :return:
        """
        distances = []
        indices = []
        for row in range(self.__rows):
            indices.append(row)
            distances.append(
                self.__get_shortest_distance_to_mediod(row, self.medoids)[1]
            )
        distances_index = np.argsort(distances)
        choosen_dist = self.__select_distant_medoid(distances_index)
        return indices[choosen_dist]

    def __select_distant_medoid(self, distances_index):
        """

        :param distances_index:
        :return:
        """
        start_index = round(self.start_prob * len(distances_index))
        end_index = round(self.end_prob * (len(distances_index) - 1))
        return distances_index[random.randint(start_index, end_index)]

    def __get_distance(self, x1, x2):
        """

        :param x1:
        :param x2:
        :return:
        """
        a = self.__data[x1].toarray() if self.__is_csr else np.array(self.__data[x1])
        b = self.__data[x2].toarray() if self.__is_csr else np.array(self.__data[x2])
        return np.linalg.norm(a - b)

    def __set_data_type(self):
        """

        :return:
        """
        """to check whether the given input is of type "list" or "csr" """
        if isinstance(self.__data, csr_matrix):
            self.__is_csr = True
            self.__rows = self.__data.shape[0]
            self.__columns = self.__data.shape[1]
        elif isinstance(self.__data, list):
            self.__is_csr = False
            self.__rows = len(self.__data)
            self.__columns = len(self.__data[0])
        else:
            raise ValueError("Invalid input")
