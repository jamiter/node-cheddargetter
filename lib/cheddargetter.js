var https = require("https");
var qs = require("qs");
var xml2js = require("xml2js");
var concat = require("concat-stream");

var cheddargetter = module.exports = function (user, pass, productCode) {
	this.auth = "Basic " + new Buffer(user + ":" + pass).toString("base64");
	this.pass = pass;
	this.productCode = productCode;
};

var arrays = [
	'plans',
	'customers',
	'items',
	'charges',
	'invoices',
	'subscriptions',
	'transactions',
	'promotions'
];

var validator = function (xpath, currentValue, newValue) {
	// Empty values should be null
	if(!newValue) {
		return null;
	}

	// Parse integers
	if(!isNaN(newValue)) {
		return +newValue;
	}

	var paths = xpath.split('/');
	var item = paths[paths.length-1];

	if (arrays.indexOf(item) === -1) {
		return newValue;
	} else {
		// Slice of the 's'
		var child = item.slice(0, item.length-1);

		// Make sure the child is an array using the concat function
		return [].concat(newValue[child]);
	}
};

cheddargetter.prototype.callAPI = function (data, path, callback) {
	if (typeof(path) == "function") {
		callback = path;
		path = data;
		data = null;
	}

	// Encode the path, because some codes can contain spaces
	path = encodeURI(path);

	var config = {
		host: "cheddargetter.com",
		port: 443,
		headers: {authorization: this.auth},
		path: "/xml" + path,
		method: "POST"
	};

	if (data) {
		data = qs.stringify(data);

		config.headers["Content-Type"] = "application/x-www-form-urlencoded";
		config.headers["Content-Length"] = data.length;
	}

	var req = https.request(config, function (res) {
		var failed = false;

		// Handle response error
		res.on('error', function (err) {
			// Mark this request as failed so it does not handle any incoming data
			var failed = true;
			return callback(err);
		});

		res.pipe(concat(function (data) {
			if (failed) {
				return;
			}

			var parseOptions = {
				explicitRoot: true,
				explicitArray: false,
				validator: validator,
				emptyTag: null,
				mergeAttrs: true
			};

			var xml = new xml2js.Parser(parseOptions);

			xml.parseString(data, function (err, xml) {
				// Handle error
				if (err) {
					return callback(err);
				}
				// Handle empty xml
				else if (!xml) {
					return callback(null, null);
				}

				var type = Object.keys(xml)[0];

				if (type == "error") {
					var error = new Error(xml[type]._);
					error.code = +xml[type].code;
					callback(error);
				} else {
					callback(null, xml[type]);
				}
			});
		}));
	});

	req.on("error", function (err) {
		console.log("Payment API Error");
		callback(err, null);
	});

	if (data) {
		req.write(data);
	}

	req.end();
};

cheddargetter.prototype.getAllPricingPlans = function (callback) {
	this.callAPI("/plans/get/productCode/" + this.productCode, callback);
};

cheddargetter.prototype.getPricingPlan = function (code, callback) {
	this.callAPI("/plans/get/productCode/" + this.productCode + "/code/" + code, function (err, plans) {
		if (err) {
			callback(err);
		} else {
			// Return the first plan (it should only contain 1)
			callback(null, plans[0]);
		}
	});
};

cheddargetter.prototype.getAllCustomers = function (data, callback) {
	if (!callback && typeof(data) == "function") {
		callback = data;
		data = null;
	}
	this.callAPI(data, "/customers/get/productCode/" + this.productCode, callback);
};

cheddargetter.prototype.getCustomer = function (code, callback) {
	this.callAPI("/customers/get/productCode/" + this.productCode + "/code/" + code, function (err, customers) {
		if (err) {
			callback(err);
		} else {
			// Return the first customer (it should only contain 1)
			callback(null, customers[0]);
		}
	});
};

cheddargetter.prototype.createCustomer = function (data, callback) {
	this.callAPI(data, "/customers/new/productCode/" + this.productCode, callback);
};

cheddargetter.prototype.editCustomerAndSubscription = function (code, data, callback) {
	this.callAPI(data, "/customers/edit/productCode/" + this.productCode + "/code/" + code, callback);
};
cheddargetter.prototype.updateCustomerAndSubscription = cheddargetter.prototype.editCustomerAndSubscription;

cheddargetter.prototype.editCustomer = function (code, data, callback) {
	this.callAPI(data, "/customers/edit-customer/productCode/" + this.productCode + "/code/" + code, callback);
};
cheddargetter.prototype.updateCustomer = cheddargetter.prototype.editCustomer;

cheddargetter.prototype.editSubscription = function (code, data, callback) {
	this.callAPI(data, "/customers/edit-subscription/productCode/" + this.productCode + "/code/" + code, callback);
};
cheddargetter.prototype.updateSubscription = cheddargetter.prototype.editSubscription;

cheddargetter.prototype.deleteCustomer = function (code, callback) {
	this.callAPI("/customers/delete/productCode/" + this.productCode + "/code/" + code, callback);
};

cheddargetter.prototype.cancelSubscription = function (code, callback) {
	this.callAPI("/customers/cancel/productCode/" + this.productCode + "/code/" + code, callback);
};

cheddargetter.prototype.addItem = function (code, itemCode, amount, callback) {
	if (!callback && typeof(amount) == "function") {
		callback = amount;
		amount = null;
	}

	if (amount) {
		amount = {quantity: amount.toString()};
	}

	this.callAPI(amount, "/customers/add-item-quantity/productCode/" + this.productCode + "/code/" + code + "/itemCode/" + itemCode, callback);
};

cheddargetter.prototype.removeItem = function (code, itemCode, amount, callback) {
	if (!callback && typeof(amount) == "function") {
		callback = amount;
		amount = null;
	}

	if (amount) {
		amount = {quantity: amount.toString()};
	}

	this.callAPI(amount, "/customers/remove-item-quantity/productCode/" + this.productCode + "/code/" + code + "/itemCode/" + itemCode, callback);
};

cheddargetter.prototype.setItemQuantity = function (code, itemCode, amount, callback) {
	amount = {quantity: amount.toString()};
	this.callAPI(amount, "/customers/set-item-quantity/productCode/" + this.productCode + "/code/" + code + "/itemCode/" + itemCode, callback);
};

cheddargetter.prototype.addCustomCharge = function (code, chargeCode, quantity, amount, description, callback) {
	var data = {
		chargeCode: chargeCode,
		quantity: quantity.toString(),
		eachAmount: amount.toString(),
		description: description
	};

	this.callAPI(data, "/customers/add-charge/productCode/" + this.productCode + "/code/" + code, callback);
};

cheddargetter.prototype.deleteCustomCharge = function (code, chargeId, callback) {
	chargeId = {chargeId: chargeId};
	this.callAPI(amount, "/customers/delete-charge/productCode/" + this.productCode + "/code/" + code, callback);
};
