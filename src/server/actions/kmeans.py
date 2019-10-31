import time

import numpy as np
from sklearn.cluster import MiniBatchKMeans
from random import shuffle
from clustering.prog_kmeans import prog_kmeans_cpp

# TODO: implement c++ version for minibacthkmeans


class ProgKMeans(prog_kmeans_cpp.ProgKMeans):
    """Progressive usage of MiniBatchKMeans.
    Parameters
    ----------
    n_clusters: int, optional, (default=3)
        The number of clusters to form as well as the number of centroids to
        generate.
    batch_size: int, optional, (default=0)
        The batch size for incremental update of k-means. If batch_size <
        n_clusters, batch_size will be set as batch_size = n_clusters.
        (because of limitation of MiniBatchKMeans)
    Attributes
    ----------
    Examples
    --------
    >>> import numpy as np
    >>> from prog_kmeans import ProgKMeans

    >>> prog_kmeans = ProgKMeans(n_clusters=3)

    >>> # initial data
    >>> X = np.array([[1, 2], [1, 4], [1, 0], [4, 2], [4, 4], [4, 0]])

    >>> prog_kmeans.progressive_fit(X, latency_limit_in_msec=10)
    >>> labels = prog_kmeans.predict(X)
    >>> labels

    >>> # add one new feature for each data point
    >>> X = np.array([[1, 2, 4], [1, 4, 4], [1, 0, 4], [4, 2, 4], [4, 4, 4], [4, 0,
    ...                                                                       4]])
    >>> prog_kmeans.progressive_fit(X, latency_limit_in_msec=10)
    >>> prog_kmeans.predict(X)

    >>> # convert current labels to consistent labels with previous labels
    >>> labels, _ = prog_kmeans.consistent_labels(labels, prog_kmeans.predict(X))
    >>> labels

    Notes
    -----
    References
    ----------
    """

    def __init__(self, n_clusters=3, batch_size=0):
        # batch kmeans only can take batch_size >= n_clusters
        if batch_size < n_clusters:
            batch_size = n_clusters
        self.kmeans = None
        self.X = None
        self.n_clusters = n_clusters
        self.batch_size = batch_size

        super().__init__(n_clusters, batch_size)

    def progressive_fit(self,
                        X,
                        latency_limit_in_msec=1000,
                        point_choice_method="from_prev_cluster",
                        verbose=False):
        """Progressive fit with data points, X. With this, clusters (or macro
        clusters) and micro clusters are updated progressively and
        incrementally within an indicated latency limit.
        Parameters
        ----------
        X : array-like, shape (n_samples, n_features)
            Training data, where n_samples is the number of samples and
            n_features is the number of features.
        latency_limit_in_msec: int, optional, (default=1000)
            Latency limit for incremental fits. Once total duration time passed
            this time, the incremental update will be stopped.
        point_choice_method: string, optional, (default="from_prev_cluster")
            Point selection method from all n_samples. Options are as below.
            "random": randomly select one data point for each incremental
                update.
            "from_prev_cluster": use labels to (macro) clusters of previous
                progressive fit result. For each incremental update, select one
                data point from each different (macro) cluster.
            "as_is": select one data point in the order of data points as it is
                in X for each incremental update.
            "reverse": select one data point in the reverse order of data points
                in X for each incremental update.
        verbose: boolean, optional (default=False)
            If True, print out how many data points are processsed during
            progressive_fit.
        Returns
        -------
        self : object
            Returns the instance itself.
        """
        start_time = time.time()

        n, _ = X.shape
        latency_limit = latency_limit_in_msec / 1000.0

        order = [i for i in range(n)]
        if point_choice_method == 'random':
            shuffle(order)
        elif point_choice_method == 'as_is':
            None  # Do nothing
        elif point_choice_method == 'reverse':
            order.reverse()
        elif point_choice_method in ("fromPrevCluster", "from_prev_cluster",
                                     "from_prev_macro", "fromPrevMacro"):
            if self.kmeans is not None:
                labels = self.kmeans.predict(self.X)
                order = ProgKMeans.random_order_from_each_cluster(n, labels)
        else:
            print("point_choice_method-", point_choice_method,
                  " is not supported. We used as_is instead of this.")

        # incrementally applying clustering
        self.kmeans = MiniBatchKMeans(
            n_clusters=self.n_clusters, batch_size=self.batch_size)
        self.X = X
        duration = 0
        n_processed = 0
        while True:
            self.kmeans = self.kmeans.partial_fit(
                X[order[n_processed:n_processed + self.batch_size], :])
            n_processed += self.batch_size
            duration = time.time() - start_time
            if (duration >= latency_limit or n_processed >= n):
                break
        if verbose:
            print(str(n_processed), " data points are processed")

    def predict(self, X):
        """Predict the closest macro cluster each sample in X belongs to.
        Parameters
        ----------
        X : array-like, shape (n_samples, n_features)
            Training data, where n_samples is the number of samples and
            n_features is the number of features.
        Returns
        -------
        labels : array, shape [n_samples,]
            Index of the macro cluster each sample belongs to.
        """
        return self.kmeans.predict(X)

    def consistent_labels(self,
                          prev_labels,
                          current_labels,
                          latency_limit_in_msec=1000,
                          verbose=False):
        """Find consistent labels with previous labels to avoid dramatically
        changing cluster labels from previous to current.
        Parameters
        ----------
        prev_labels : array, shape [n_samples, ]
            Cluster labels obtained in last progressiveFit.
        current_labels : array, shape [n_samples, ]
            Cluster labels obtained in current progressiveFit.
        verbose: boolean, optional (default=False)
            If True, print out how many data points are processsed during
            progressive process.
        Returns
        -------
        labels : array, shape [n_samples,]
            Index of the macro cluster each sample belongs to.
        current_label_to_previous_label : dictionary
            Dictionary from the current label to the corresponding previous
            label.
        """
        return super().consistent_labels(prev_labels, current_labels,
                                         latency_limit_in_msec, verbose)

    def get_centers(self):
        centers = None
        if self.kmeans is not None:
            centers = self.kmeans.cluster_centers_
        return centers
