import loadFile from './control/loadFile'
import { getConfigFile } from '../routes'

export default class ConfigJSON{
    constructor(){
	let container = document.getElementById('config_file_editor')
	loadFile(container)

	function handleFileSelect(evt) {
	    var files = evt.target.files; // FileList object

	    // Loop through the FileList and render image files as thumbnails.
	    for (var i = 0, f; f = files[i]; i++) {

		// Only process json files.
		if (!f.type.match('json.*')) {
		    continue;
		}

		let reader = new FileReader();
		let jsonContainer = document.createElement('div')
		// Closure to capture the file information.
		reader.onload = (function(theFile) {
		    return function(e) {
			let options = {}
			let editor = new JSONEditor(jsonContainer, options)			

			let json = JSON.parse(e.target.result)
			editor.set(json)
			console.log(editor)
		    };
		})(f);

		// Read in the image file as a data URL.
		reader.readAsText(f);

		container.appendChild(jsonContainer);

	    }
	}

	document.getElementById('inputFileBtr').addEventListener('change', handleFileSelect, false);	
    }
}
