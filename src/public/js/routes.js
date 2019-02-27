/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable no-param-reassign */
/* eslint-disable camelcase */
/* eslint-disable prefer-destructuring */
import histogramUI from './components/histogram';
import scatterPlotUI from './components/scatterPlot';
import { displayFunctions } from './components/functionList';

function request(title, data) {
    console.log('Request - ', title);
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'GET',
            contentType: 'application/json',
            url: `/${title}`,
            data: { in_data: JSON.stringify(data) },
            success: (data) => {
                data = JSON.parse(data);
                console.log(data);
                if (self.debug) {
                    console.log('[', title, '] Data:', data);
                }
                resolve(data[0]);
            },
            error(err) {
                if (err) { console.log(err); }
                reject();
            },
        });
    });
}

function getCCT(attr) {
    return request('getCCT', attr);
}


function getSankey(attr) {
    return request('getSankey', attr);
}

function splitCaller(idList) {
    idList = JSON.stringify(idList);
    return request('splitCaller', idList);
}

function getConfigFile(filename, _cb) {
    return request('loadConfigFile', filename);
}

function getDataMaps(attr, _cb) {
    return request('getMaps', attr);
}


function getNodeMetrics(_cb) {
    return request('getNodeMetrics', []);
}

function getGraphEmbedding(_cb) {
    return request('getGraphEmbedding', []);
}

function getHierarchy(node) {
    return new Promise((resolve, reject) => {
        let n_index;
        if (node.n_index instanceof Array) {
            n_index = node.n_index[0];
        } else {
            n_index = node.n_index;
        }
        if (n_index != undefined) {
            $.ajax({
                type: 'GET',
                contentType: 'application/json',
                dataType: 'json',
                url: '/getHierarchy',
                data: {
                    in_data: JSON.stringify({
                        n_index,
                    }),
                },
                success(data) {
                    data = JSON.parse(JSON.stringify(data));
                    console.log('Hierarchy data', data);
                    resolve(data);
                },
                error(err) {
                    if (err) {
                        console.log(err);
                        console.log('There was problem with getting the data for next level nodes');
                    }
                    reject(err);
                },
            });
        }
    });
}

function getHistogramData(node, cb) {
    console.log('Request - getHistogramData');
    if (node.n_index != undefined) {
        console.log(node);
        $.ajax({
            type: 'GET',
            contentType: 'application/json',
            dataType: 'json',
            url: '/getHistogramData',
            data: {
                in_data: JSON.stringify({
                    n_index: node.n_index[0],
                    mod_index: node.mod_index[0],
                }),
            },
            success(histScatData) {
                if (cb) {
                    let data = { exc: histScatData.exc, inc: histScatData.inc };
                    data = histogramUI(data);
                    cb(data);
                    return;
                }
                console.log('[Getter] Histogram Scatter Data: ', histScatData);
                const data = histScatData;
                scatterPlotUI(data);
                histogramUI(data);
                return histScatData;
            },
            error() {
                console.log('There was problem with getting the data for histogram and scatter plot');
            },
        });
    }
}

function getFunctionLists(node) {
    let n_index;
    let mod_index;
    if (node.n_index instanceof Array) {
        n_index = node.n_index[0];
        mod_index = node.mod_index[0];
    } else {
        n_index = node.n_index;
        mod_index = node.mod_index;
    }
    if (n_index != undefined) {
        $.ajax({
            type: 'GET',
            contentType: 'application/json',
            dataType: 'json',
            url: '/getFunctionLists',
            data: {
                in_data: JSON.stringify({
                    n_index,
                    mod_index,
                }),
            },
            success(data) {
                console.log('Function lists', data);
                displayFunctions(data);
                return data;
            },
            error() {
                console.log('There was problem with getting the data for histogram and scatter plot');
            },
        });
    }
}

export {
    getDataMaps,
    getNodeMetrics,
    getSankey,
    getConfigFile,
    getHistogramData,
    getFunctionLists,
    getCCT,
    getHierarchy,
    splitCaller,
    getGraphEmbedding,
};
