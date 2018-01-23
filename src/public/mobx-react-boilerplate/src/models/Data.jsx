import { observable, action, computed } from 'mobx'
import { Collection, Model } from 'mobx-rest'
import { extendObservable } from 'mobx'

class DataModel extends Model {
    constructor(data){
	super(data)
	console.log(data);
    }
    @computed get data(){
	
    }

}

class DataCollection extends Collection {
    url() { return `/reactGetSankey` }
    model() { return DataModel }
}


export default new DataCollection()
