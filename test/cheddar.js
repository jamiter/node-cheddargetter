/* eslint-disable func-names */
/* eslint-env node, mocha */
var chai = require('chai');
var Cheddar = require('../lib/cheddar');
var config = require('../config.json');

async function wait(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

describe('Cheddar', function () {
    this.timeout(30000);
    this.slow(2000);

    beforeEach(function () {
        this.customerCode1 = 'customerCode1';
        this.customerCode2 = 'customerCode2';
        this.cheddar = new Cheddar(config.email, config.pass, config.productCode);
    });

    describe('Plans', async function () {
        describe('#getAllPricingPlans', function () {
            it('should return a plan array', async function () {
                var plans = await this.cheddar.getAllPricingPlans();

                chai.expect(plans).to.be.an('array');
                chai.expect(plans.length).to.be.at.least(1);
            });
        });

        describe('#getPricingPlan', function () {
            it('should return a single plan', async function () {
                var plan = await this.cheddar.getPricingPlan(config.planCode);

                chai.expect(typeof plan).to.equal('object');
            });

            it('should fail on bad plan code', async function () {
                try {
                    await this.cheddar.getPricingPlan('Bad Plan Code');
                } catch (err) {
                    chai.expect(err.message).to.include('Plan not found');
                }
            });
        });
    });

    describe('Customers', function () {
        describe('#createCustomer', function () {
            it('should create a customer', async function () {
                var subscriptionData = {
                    planCode: config.planCode,
                    method: 'cc',
                    ccNumber: '4111111111111111',
                    ccExpiration: '12/2020',
                    ccCardCode: '123',
                    ccFirstName: 'FName',
                    ccLastName: 'LName',
                    ccZip: '95123',
                };

                await this.cheddar.createCustomer({
                    code: this.customerCode1,
                    firstName: 'FName',
                    lastName: 'LName',
                    email: 'test@example.com',
                    subscription: subscriptionData,
                });

                await this.cheddar.createCustomer({
                    code: this.customerCode2,
                    firstName: 'FName2',
                    lastName: 'LName2',
                    email: 'test2@example.com',
                    subscription: subscriptionData,
                });
            });
        });

        describe('#getAllCustomers', function () {
            it('should retrieve all customers', async function () {
                // Make sure the customers are created
                await wait(2000);

                var options = {
                    planCode: [config.planCode],
                    subscriptionStatus: 'activeOnly',
                    orderBy: 'createdDatetime',
                    orderByDirection: 'desc',
                    createdAfterDate: '2017-01-01',
                };

                var customers = await this.cheddar.getAllCustomers(options);

                chai.expect(customers).to.be.an('array');
                chai.expect(customers.length).to.equal(2);
                chai.expect(customers[0].code).to.equal(this.customerCode2);
            });
        });

        describe('#getCustomer', function () {
            it('should retrieve a customer with the right code', async function () {
                var customer = await this.cheddar.getCustomer(this.customerCode1);
                chai.expect(customer).to.be.an('object');
            });

            it('should fail with bad code', async function () {
                try {
                    await this.cheddar.getCustomer('Bad Customer Code');
                } catch (err) {
                    chai.expect(err.message).to.include('Customer not found');
                }
            });
        });
    });

    describe('Items', function () {
        describe('#setItemQuantity', function () {
            it('should increase the item count', async function () {
                await this.cheddar.setItemQuantity(this.customerCode1, config.itemCode, 1);

                var customer = await this.cheddar.getCustomer(this.customerCode1);

                chai.expect(customer.subscriptions[0].items[0].quantity).to.equal(1);
            });
        });

        describe('#addItem', function () {
            it('should add to the item count', async function () {
                await this.cheddar.addItem(this.customerCode1, config.itemCode, 2);

                var customer = await this.cheddar.getCustomer(this.customerCode1);

                chai.expect(customer.subscriptions[0].items[0].quantity).to.equal(1 + 2);
            });

            it('should default to 1 as item count', async function () {
                await this.cheddar.addItem(this.customerCode1, config.itemCode);

                var customer = await this.cheddar.getCustomer(this.customerCode1);

                chai.expect(customer.subscriptions[0].items[0].quantity).to.equal(1 + 2 + 1);
            });
        });

        describe('#removeItem', function () {
            it('should decrease the item count', async function () {
                await this.cheddar.removeItem(this.customerCode1, config.itemCode, 2);

                var customer = await this.cheddar.getCustomer(this.customerCode1);

                chai.expect(customer.subscriptions[0].items[0].quantity).to.equal(2);
            });

            it('should default to 1 as item count', async function () {
                await this.cheddar.removeItem(this.customerCode1, config.itemCode);

                var customer = await this.cheddar.getCustomer(this.customerCode1);

                chai.expect(customer.subscriptions[0].items[0].quantity).to.equal(1);
            });
        });
    });

    describe('#deleteCustomer', function () {
        it('should remove a specific customer', async function () {
            await this.cheddar.deleteCustomer(this.customerCode1);
        });
    });

    describe('#deleteAllCustomers', function () {
        it('should remove all customers (in development mode)', async function () {
            var ts = Math.round((new Date()).getTime() / 1000) + 2000;
            await this.cheddar.deleteAllCustomers(ts);

            try {
                this.cheddar.getAllCustomers({});
            } catch (err) {
                chai.expect(err.message).to.include('No customers found');
            }
        });
    });
});
