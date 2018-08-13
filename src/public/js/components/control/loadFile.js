export default function loadFile(parent){
    let inputFile = document.createElement('div')
    inputFile.setAttribute("class", "controlComponent")
    
    let inputFileLabel = document.createElement("label")
    inputFileLabel.textContent = "Load file"

    let inputFileContent = document.createElement('div');
    inputFileContent.setAttribute("id", "loadFile");
    
    let button=$('<input/>').attr({
	    type: "file",
	    id: "inputFileBtr",
	    value: "set",
    });

    // mount to the DOM
    button.appendTo(inputFileContent);    
    inputFile.append(inputFileLabel);
    inputFile.append(inputFileContent);
    $(parent).append(inputFile)

    $('input[id="inputFileBtr"]').on('change', function(){
	return $('input[id="inputFileBtr"]').val();
    })
}
