export default class View {
    start (){
        controlUI();
        functionListUI();
        var parentOfSankeyView =  document.getElementById("procedure_view").parentElement;        
        target = parentOfSankeyView;
        spinner = new Spinner(opts).spin(parentOfSankeyView);
        spinner.stop();
        startVis();
    }
}
