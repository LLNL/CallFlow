export default function showName(){
    let label = document.createElement("label");
    let  description = document.createTextNode('Show Name: ');
    let checkbox = document.createElement("input");
    
    checkbox.type = "checkbox";
    // checkbox.name = dat["name"];
    // checkbox.value = dat["procID"];
    checkbox.setAttribute('id', "showLabelBox");

    label.appendChild(description);
    label.appendChild(checkbox);

    document.getElementById('control').appendChild(label);
    $('#showLabelBox').attr('checked',false);
}
