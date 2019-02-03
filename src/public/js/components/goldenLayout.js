import { start, App } from './../app'

var app_global

//configuration for the layout of the page
let config = {
    settings: {
	    showCloseIcon : false,
	    showPopoutIcon : false,
	    reorderEnabled : false
    },

    content: [{
	    type: 'row',
	    content: [
	        {
		        type: 'column',
		        width: $(window).width() * 25,
		        content: [
		            // {

		            // 	type: 'component',
		            // 	componentName: 'testComponent',
		            // 	// id: 'control',
		            // 	componentState: {id : "control" },
		            // 	isClosable: false,
		            // 	title: "Control"								
		            // },
		            // {

		            // 	type: 'component',
		            // 	componentName: 'testComponent',
		            // 	// id: 'control',
		            // 	componentState: {id : "stat_view" },
		            // 	isClosable: false,
		            // 	title: "Statistic View"								
		            // },
		            {
			            type: 'stack',
			            content: [
                            {
				                type: 'component',
				                componentName: 'testComponent',
				                componentState: {id : "scat_view" },
				                isClosable: false,
				                title: "Scatter Plot View"
			                },
                            {
				                type: 'component',
				                componentName: 'testComponent',
				                componentState: {id : "config_file_editor" },
				                isClosable: false,
				                title: "Config file"								
			                },								
			                {
				                type: 'component',
				                componentName: 'testComponent',
				                componentState: {id : "info_view" },
				                isClosable: false,
				                title: "Node Info"
			                },								
			            ]
		            },
		            {
			            type: 'component',
			            componentName: 'testComponent',
			            componentState: {id : "hist_view" },
			            isClosable: false,
			            title: "Histogram View"	
		            }
		        ]
	        },
	        {	
		        type: 'column',
		        width: $(window).width() * 50,
		        content: [
		            {
			            type: 'stack',
			            content: [
			                {
				                type: 'component',
				                componentName: 'testComponent',
				                componentState: { id: 'procedure_view' },
				                title: 'Call graph view'
			                },			                
			            ]
		            },
		            {
		                type: 'stack',
		                content: [
		                    {
		    	                type: 'component',
		    	                componentName: 'testComponent',
		    	                componentState: { id: 'diff_view' },
		    	                title: 'Diff view'
		                    }
		                ]
		            }
		            
		        ]
		    },
            {
                type: 'column',
                width: $(window).width()*20,
                content : [
                    {
                        type: 'stack',
                        content: [
                            {
				                type: 'component',
				                componentName: 'testComponent',
				                componentState: {id : "fList_view" },
				                isClosable: false,
				                title: "Function List"
			                },								

                            {
				                type: 'component',
				                componentName: 'testComponent',
				                componentState: {id : "control" },
				                isClosable: false,
				                title: "Control"
			                }
                        ]
                    },
                    {
                        type: 'stack',
                        content: [
                            {
				                type: 'component',
				                componentName: 'testComponent',
				                componentState: {id : "component_graph_view" },
				                isClosable: false,
				                title: "Component Graph view"
			                },
                            {
				                type: 'component',
				                componentName: 'testComponent',
				                componentState: {id : "CCT_view" },
				                isClosable: false,
				                title: "CCT view"
			                }

                        ]
                    },	                   
                ]
            }
            
	    ]
    }]			
}

// Set the container width and height
function setMainContainerBox(){
    $("#main_container").width( $(window).width() - 10);
    $("#main_container").height( $(window).height() - $("#nav_bar").height() - 30);
}

export default class Layout {
    constructor(cb){
        setMainContainerBox()
        this.layout = new GoldenLayout( config , $("#main_container"));
	    
        this.ids = []
        
        self = this
        this.layout.registerComponent( 'testComponent', function( container, state ){
            container.getElement().html( "<div id = " + state.id + " > </div>" );
            self.ids.push(state.id);
        });
        
        this.layout.on("initialised", function (){
            self.update();
	        self.app = new App()
        });

        this.layout.on('stateChanged', function(component){
            self.update();
        })

        this.layout.init();
    }
}

Layout.prototype.update = function(ids){
    this.ids.forEach(function(id){
	    $("#" + id).width( $("#" + id).parent().width() );
	    $("#" + id).height( $("#" + id).parent().height() );
    })		

    // Commenting for now...
    // if(sankeyVis){
    //     // console.log(d3.select("#procedure_view svg"));
    //     // d3.select("#procedure_view svg")
    //     // 	.attr("width", $("#procedure_view").width() )
    //     // 	.attr("height", $("#procedure_view").height() )

    //     sankeyVis1.updateSize({'width' : $("#procedure_view").width(),
    // 		                   'height' : $("#procedure_view").height()/2 })

    //     sankeyVis2.updateSize({'width' : $('#procedure_view').width(),
    // 		                   'height': $('#procedure_view').height()/2 });
    // }	

    // if(scatterPot){
    //     scatterPot.setContainerWidth( $("#scat_view").width() );
    //     scatterPot.setContainerHeight( $("#scat_view").height() );
    //     scatterPot.reDraw();
    // }
    // if(histogram){
    //     histogram.setContainerWidth( $("#hist_view").width() );
    //     histogram.setContainerHeight( $("#hist_view").height() );
    //     histogram.reDraw();

    // }

    // $("#list_view").width( $("#fList_view").width() );
    // $("#list_view").height( $("#fList_view").height() - 50 );
    // if(listData){
    //     displayList();
    // }
}
