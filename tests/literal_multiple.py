from hatchet import GraphFrame
# import sys
# import pandas as pd

def run():
    states = {}
    gf1 = GraphFrame()
    gf1.from_literal([{
                        'name': 'foo',
                        'metrics': {'time (inc)': 180.0, 'time': 0.0},
                        'children': [
                            {
                                'name': 'bar',
                                'metrics': {'time (inc)': 100.0, 'time': 10.0},
                                'children': [
                                    {
                                        'name': 'baz',
                                        'metrics': {'time (inc)': 0.0, 'time': 65.0}
                                    },
                                    {
                                        'name': 'grault',
                                        'metrics': {'time (inc)': 0.0, 'time': 25.0}
                                    }
                                ] 
                            },
                            {
                                'name': 'qux',
                                'metrics': {'time (inc)': 80.0, 'time': 0.0},
                                'children': [
                                    {
                                        'name': 'baz',
                                        'metrics': {'time (inc)': 0.0, 'time': 45.0}
                                    },
                                    {
                                        'name': 'grault',
                                        'metrics': {'time (inc)': 0.0, 'time': 35.0}
                                    }
                                ]
                            }
                        ],
                    },
                    {
                        'name': 'waldo',
                        'metrics': {'time (inc)': 80.0, 'time': 0.0},
                        'children': [
                            {
                                'name': 'bar',
                                'metrics': {'time (inc)': 60.0, 'time': 20.0},
                                'children': [
                                    {
                                        'name': 'baz',
                                        'metrics': {'time (inc)': 0.0, 'time': 30.0}
                                    },
                                    {
                                        'name': 'grault',
                                        'metrics': {'time (inc)': 0.0, 'time': 30.0}
                                    }
                                ]
                            },
                        ]
                    }
                    ])

    states['literal-1'] = {
        'df': gf1.dataframe,
        'graph': gf1.graph
    }

    gf2 = GraphFrame()
    gf2.from_literal([{
                        'name': 'foo',
                        'metrics': {'time (inc)': 90.0, 'time': 0.0},
                        'children': [
                            {
                                'name': 'bar',
                                'metrics': {'time (inc)': 30.0, 'time': 0.0},
                                'children': [
                                    {
                                        'name': 'baz',
                                        'metrics': {'time (inc)': 0.0, 'time': 10.0}
                                    },
                                    {
                                        'name': 'grault',
                                        'metrics': {'time (inc)': 0.0, 'time': 20.0}
                                    }
                                ]
                            },
                            {
                                'name': 'qux',
                                'metrics': {'time (inc)': 60.0, 'time': 0.0},
                                'children': [
                                    {
                                        'name': 'baz',
                                        'metrics': {'time (inc)': 0.0, 'time': 55.0}
                                    },
                                    {
                                        'name': 'grault',
                                        'metrics': {'time (inc)': 0.0, 'time': 5.0}
                                    }
                                ]
                            }
                        ],
                    },
                    {
                        'name': 'waldo',
                        'metrics': {'time (inc)': 80.0, 'time': 0.0},
                        'children': [
                            {
                                'name': 'bar',
                                'metrics': {'time (inc)': 70.0, 'time': 10.0},
                                'children': [
                                    {
                                        'name': 'baz',
                                        'metrics': {'time (inc)': 0.0, 'time': 35.0}
                                    },
                                    {
                                        'name': 'grault',
                                        'metrics': {'time (inc)': 0.0, 'time': 35.0}
                                    }
                                ]
                            },
                        ]
                    }
                    ])

    states['literal-2'] = {
        'df': gf2.dataframe,
        'graph': gf2.graph
    }

    return states
