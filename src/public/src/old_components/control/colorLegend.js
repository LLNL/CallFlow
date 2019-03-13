/* eslint-disable no-undef */
/* eslint-disable prefer-destructuring */
export default function colorScaleLegend(colorOption) {
    const w = 200; 
    const h = 70;
    const colorScaleHeight = 30;
    let nodeRunTimeColorScale;
    let spanColor;
    let innerHTMLText = [];
    if (colorOption != 4) {
	    nodeRunTimeColorScale = 'OrRd';
	    spanColor = chroma.scale(nodeRunTimeColorScale).padding([0.2, 0]).domain([0, 99]);
	    innerHTMLText = ['low', 'high'];
    } else {
	    nodeRunTimeColorScale = 'RdYlBu';
	    spanColor = chroma.scale(nodeRunTimeColorScale).domain([0, 99]);
	    innerHTMLText = ['-1', '1'];
    }

    const timeScaleDiv = document.getElementById('metricColorScale');
    $('#metricColorScale').width(200);
    $('#metricColorScale').height(h);
    $('#metricColorScale').empty();
    if (colorOption > 0) {
	    for (let i = 0; i < 100; i++) {
	        // nodeRunData.push(i);
	        const newSpan = document.createElement('span');
	        newSpan.style.backgroundColor = spanColor(i);
	        newSpan.style.display = 'inline-block';
	        newSpan.style.height = `${colorScaleHeight  }px`;
	        newSpan.style.width = '1%';
	        timeScaleDiv.appendChild(newSpan);
	    }

	    const fastSpan = document.createElement('span');
	    // fastSpan.setAttribute("id", "fastSpan");
	    fastSpan.style.position = 'relative';
	    fastSpan.style.left = '0';
	    fastSpan.style.fontSize = '15px';
	    fastSpan.style.fontFamily = 'sans-serif';
	    fastSpan.style.top = '5px';
	    fastSpan.innerHTML = innerHTMLText[0];
	    fastSpan.setAttribute('id', 'slowAttr');
	    timeScaleDiv.appendChild(fastSpan);

	    const slowSpan = document.createElement('span');
	    slowSpan.style.position = 'absolute';
	    // slowSpan.style.left = "140";
	    slowSpan.style.left = '190';
	    slowSpan.style.fontSize = '15px';
	    slowSpan.style.fontFamily = 'sans-serif';
	    // slowSpan.style.top = $("#metricColorScale").position().top + colorScaleHeight + 5;// + 5;
	    slowSpan.style.top = $('#slowAttr').position().top;
	    slowSpan.innerHTML = innerHTMLText[1];
	    slowSpan.setAttribute('id', 'fastAttr');

        //	console.log($("#metricColorScale").position().top, colorScaleHeight, $("#slowAttr").position().top);
	    timeScaleDiv.appendChild(slowSpan);
    }
}
