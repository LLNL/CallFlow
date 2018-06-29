export default function loadFile(){
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
    $('#control').append(inputFile)
}
