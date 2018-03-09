//configuration for the layout of the page
var config = {
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
				// id: 'control',
				componentState: {id : "control" },
				isClosable: false,
				title: "Control"								
			    },								
			    {
				type: 'component',
				componentName: 'testComponent',
				componentState: {id : "info_view" },
				isClosable: false,
				title: "Node Info"
			    },								
			    // {
			    // 	type: 'component',
			    // 	componentName: 'testComponent',
			    // 	componentState: {id : "hist_view" },
			    // 	isClosable: false,
			    // 	title: "Histogram View"
			    // },
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
				componentState: {id : "fList_view" },
				isClosable: false,
				title: "Function List"
			    },								
			]
		    },
		    {
			// type: 'component',
			// componentName: 'testComponent',
			// // id: 'control',
			// componentState: {id : "lm_view" },
			// isClosable: false,
			// title: "LM View"		

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
		width: $(window).width() * 70,
		content: [
		    {
			type: 'stack',
			content: [
			    {
				type: 'component',
				componentName: 'testComponent',
				componentState: { id: 'procedure_view' },
				title: 'Graph View'
			    },
			    {
				type: 'component',
				componentName: 'testComponent',
				componentState: { id: 'split_view' },
				title: 'Split View'
			    },
			    
			]
		    }
		]
		
	    }
	]
    }]			
}

var goldenLayout = new GoldenLayout( config , $("#main_container"));
goldenLayout.registerComponent( 'testComponent', function( container, state ){
    container.getElement().html( "<div id = " + state.id + " > </div>" );

    // donewithlayout();
    ids.push(state.id);
});

goldenLayout.on("initialised", donewithlayout);

goldenLayout.on('stateChanged', function(component){
    updateDivSizes();
})
goldenLayout.init();

function updateDivSizes(){
    ids.forEach(function(myid){
	$("#" + myid).width( $("#" + myid).parent().width() );
	$("#" + myid).height( $("#" + myid).parent().height() );
    })		

    if(sankeyVis){
	// console.log(d3.select("#procedure_view svg"));
	// d3.select("#procedure_view svg")
	// 	.attr("width", $("#procedure_view").width() )
	// 	.attr("height", $("#procedure_view").height() )

	sankeyVis1.updateSize({'width' : $("#procedure_view").width(),
			      'height' : $("#procedure_view").height()/2 })

	sankeyVis2.updateSize({'width' : $('#procedure_view').width(),
			      'height': $('#procedure_view').height()/2 });
    }	

    if(scatterPot){
	scatterPot.setContainerWidth( $("#scat_view").width() );
	scatterPot.setContainerHeight( $("#scat_view").height() );
	scatterPot.reDraw();
    }
    if(histogram){
	histogram.setContainerWidth( $("#hist_view").width() );
	histogram.setContainerHeight( $("#hist_view").height() );
	histogram.reDraw();

    }

    $("#list_view").width( $("#fList_view").width() );
    $("#list_view").height( $("#fList_view").height() - 50 );
    if(listData){
	displayList();
    }
}

function donewithlayout(){
    updateDivSizes();
    // getData();
    controlUI ();
    functionListUI();
    var parentOfSankeyView =  document.getElementById("procedure_view").parentElement;

    target = parentOfSankeyView;
    spinner = new Spinner(opts).spin(parentOfSankeyView);
    spinner.stop();
    startVis();
}
