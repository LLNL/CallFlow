import { getGraphEmbedding } from '../../routes'

export default function graphEmbedding(){
    let render_button= $('<input type="button" id="GEbtn" value="Calculate embeddings"/>');        
    $('#control').append(render_button)
    $('#GEbtn').click(function(){
        getGraphEmbedding().then((data) => {
            
        })
    })
}
