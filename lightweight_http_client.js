/* 	Lightweight javascript plugin for making HTTP requests.
*
* 	Author: Max Rochefort-Shugar
* 	Dependencies: none
*	Options: time
* 	Date: 13/09/19
*
*/

var lightweight_http_client = function(options) {
	
	this.options = options;
	
	if(this.options.constructor !== Object)
		return console.log("Error: options must be of type Object.");
	
	this.get = function(url, headers, callback) {
		
		var _this = this;
		if(this.options.time)
			var startTime = new Date();
		
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (xhttp.readyState == 4){
				if(xhttp.status == 200){
					if(_this.options.time){
						var endTime = new Date();
						var timeDiff = endTime - startTime;
						timeDiff /= 1000;
						console.log('HTTP GET: ' + timeDiff + " seconds");
					}
					callback(this.responseText);
				} else{
					callback(null, this.responseText);
				}
			}
		}
		xhttp.open("GET", url);
		for(header in headers)
			xhttp.setRequestHeader(header, headers[header]);
		xhttp.send( null );
	}
	this.post = function(url, headers, body, callback){
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function(){
			if(this.status == 200 && this.readyState == 4)
				callback(this.responseText);
			else if(this.readyState == 4 && this.status != 200)
				callback(null, this.responseText);
		}
		xhttp.open("POST", url);
		for(header in headers)
			xhttp.setRequestHeader(header, headers[header]);
	
		xhttp.send(JSON.stringify(body));
	}
	this.put = function(url, headers, body, callback){
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function(){
			if(this.status == 200 && this.readyState == 4)
				callback(this.responseText);
			else if(this.readyState == 4 && this.status != 200)
				callback(null, this.responseText);
		}
		xhttp.open("PUT", url);
		for(header in headers)
			xhttp.setRequestHeader(header, headers[header]);
		xhttp.send(JSON.stringify(body));
	}
	
	/* Get request to couchdb cluster. Assumes cluster of 3 nodes. */
	this.couchdb_get = function(url, headers, success, error){
		
		var _this = this;
		
		if(this.options.hasOwnProperty("couchdb") == false)
			return console.log("Error: missing couchdb Object.");
		if(this.options.couchdb.hasOwnProperty("available") == false)
			return console.log("Error: missing available list.");
		if(this.options.couchdb.available.constructor !== Array)
			return console.log("Error: couchdb.available must be of type Array.");
		
		var ret = this.gen_available_url(url);
		
		/* Try each server a maximum of one times. */
		this.get(ret.url, headers, success, function(err){
			
			/* Remove unavailable node */
			if(_this.options.couchdb.hasOwnProperty("unavailable") == false)
				_this.options.couchdb.unavailable = [];
			_this.options.couchdb.available.splice(ret.index, 1);
			_this.options.couchdb.unavailable.push(ret.node);
			
			/* Try again. */
			ret = _this.gen_available_url(url);
			
			_this.get(ret.url, headers, success, function(err){
			
			/* Remove unavailable node */
			if(_this.options.couchdb.hasOwnProperty("unavailable") == false)
				_this.options.couchdb.unavailable = [];
			_this.options.couchdb.available.splice(ret.index, 1);
			_this.options.couchdb.unavailable.push(ret.node);
				
				/* Try again. */
				ret = _this.gen_available_url(url);
				
				_this.get(ret.url, headers, success, function(){
					
					/* Remove unavailable node */
					if(_this.options.couchdb.hasOwnProperty("unavailable") == false)
						_this.options.couchdb.unavailable = [];
					_this.options.couchdb.available.splice(ret.index, 1);
					_this.options.couchdb.unavailable.push(ret.node);

					console.log("All nodes unavailable. Number of retries remaining: " + _this.options.couchdb.retries);
					if(_this.options.couchdb.retries > 0){
							_this.options.couchdb.retries -= 1;
							setTimeout(function(){
							_this.options.couchdb.available = JSON.parse(JSON.stringify(_this.options.couchdb.unavailable));
							_this.options.couchdb.unavailable = [];
							_this.couchdb_get(url, headers, success, error);
						}, 1000)
					}else{
						/* This function is invoked when the number of retires has been reached. */
						console.log("Max retires reached for " + url);
						_this.options.couchdb.retries = _this.options.couchdb.default_retries;
						if(error)
							error();
					}
				})
			})
		})
	
	}
	
	this.gen_available_url = function(url){
			
			var len = this.options.couchdb.available.length;
			var rand = Math.floor(Math.random() * len);
			var node = this.options.couchdb.available[rand];
			console.log(url.split('PLACEHOLDER').join(node));
			return { url: url.split('PLACEHOLDER').join(node), index: rand, node: node };
			
	}
	
}