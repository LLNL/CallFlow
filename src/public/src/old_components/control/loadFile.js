/* eslint-disable no-undef */
export default function loadFile(parent) {
    const inputFile = document.createElement('div');
    inputFile.setAttribute('class', 'controlComponent');

    const inputFileLabel = document.createElement('label');
    inputFileLabel.textContent = 'Load file';

    const inputFileContent = document.createElement('div');
    inputFileContent.setAttribute('id', 'loadFile');

    const button = $('<input/>').attr({
	    type: 'file',
	    id: 'inputFileBtr',
	    value: 'set',
    });

    // mount to the DOM
    button.appendTo(inputFileContent);
    inputFile.append(inputFileLabel);
    inputFile.append(inputFileContent);
    $(parent).append(inputFile);

    $('input[id="inputFileBtr"]').on('change', () => $('input[id="inputFileBtr"]').val());
}
