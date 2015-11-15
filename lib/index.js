'use strict';

const Joi = require('joi');

const internals = {};
internals.shim = function () {

    return Promise.resolve(this);
};

internals.wrap = function (db) {

    const wrapped = {};
    const methods = ['insert', 'find', 'findOne', 'count', 'update', 'remove'];
    const wrap = function (method) {

        return function () {

            const args = Array.from(arguments);
            return new Promise((resolve, reject) => {

                const callback = (err, res) => {

                    // $lab:coverage:off$
                    if (err) {
                        return reject(err);
                    }
                    // $lab:coverage:on$

                    return resolve(res);
                };

                args.push(callback);
                return db[method].apply(db, args);
            });
        };
    };

    for (let i = 0; i < methods.length; ++i) {
        const method = methods[i];
        wrapped[method] = wrap(method);
    }

    return wrapped;
};

module.exports = function (baseClass) {

    class Model extends baseClass {
        save() {

            // $lab:coverage:off$
            if (!this.constructor.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.constructor.type));
            }
            // $lab:coverage:on$

            const self = this;
            const validate = self.constructor.capabilities.has('validation') ? self.validate.bind(self) : internals.shim.bind(self);

            return validate().then(() => {

                return self.constructor.meta.get('db').insert(self);
            }).then((model) => {

                self._id = model._id;
                return validate();
            });
        };

        remove() {

            // $lab:coverage:off$
            if (!this.constructor.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.constructor.type));
            }
            // $lab:coverage:on$

            const self = this;
            return self.constructor.meta.get('db').remove({ _id: self._id }).then(() => {

                for (const key in self) {
                    delete self[key];
                }
            });
        };

        get() {

            // $lab:coverage:off$
            if (!this.constructor.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.constructor.type));
            }
            // $lab:coverage:on$

            const self = this;
            const validate = self.constructor.capabilities.has('validation') ? self.validate.bind(self) : internals.shim.bind(self);

            return self.constructor.meta.get('db').findOne({ _id: self._id }).then((doc) => {

                if (!doc) {
                    throw new Error('Not found');
                }

                for (const key in doc) {
                    self[key] = doc[key];
                }

                return validate();
            });
        };

        static count(query) {

            // $lab:coverage:off$
            if (!this.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.type));
            }
            // $lab:coverage:on$

            return this.meta.get('db').count(query);
        };

        static find(query) {

            // $lab:coverage:off$
            if (!this.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.type));
            }
            // $lab:coverage:on$

            const self = this;
            return self.meta.get('db').find(query).then((docs) => {

                return Promise.all(docs.map((doc) => {

                    const model = new self(doc);
                    const validate = self.capabilities.has('validation') ? model.validate.bind(model) : internals.shim.bind(self);
                    return validate().then(() => {

                        return model;
                    });
                }));
            }).catch(console.log.bind(console));
        };

        static findOne(query) {

            // $lab:coverage:off$
            if (!this.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.type));
            }
            // $lab:coverage:on$

            const self = this;
            return self.meta.get('db').findOne(query).then((doc) => {

                if (!doc) {
                    throw new Error('Not found');
                }

                const model = new self(doc);
                const validate = self.capabilities.has('validation') ? model.validate.bind(model) : internals.shim.bind(self);
                return validate().then(() => {

                    return model;
                });
            });
        };

        static update(query, update, options) {

            // $lab:coverage:off$
            if (!this.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.type));
            }
            // $lab:coverage:on$

            return this.meta.get('db').update(query, update, options || {});
        };

        static set db(db) {

            const wrapped = internals.wrap(db);
            this.meta.set('db', wrapped);
        };

        static set schema(val) {

            if (!this.capabilities.has('validation')) {
                return;
            }

            if (val.isJoi) {
                val = val.concat(Joi.object({ _id: Joi.string() }));
            }
            else {
                val._id = Joi.string();
            }

            super.schema = val;
        };
    };

    Model.capabilities.add('nedb');

    return Model;
};
