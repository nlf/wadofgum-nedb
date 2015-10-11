'use strict';

const Joi = require('joi');

let internals = {};
internals.shim = function () {

    return Promise.resolve();
};

internals.wrap = function (db) {

    let wrapped = {};
    let methods = ['insert', 'find', 'findOne', 'count', 'update', 'remove'];
    let wrap = function (method) {

        return function () {

            let args = Array.from(arguments);
            return new Promise((resolve, reject) => {

                let callback = (err, res) => {

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

    for (let i = 0, il = methods.length; i < il; ++i) {
        let method = methods[i];
        wrapped[method] = wrap(method);
    }

    return wrapped;
};

module.exports = function (baseClass) {

    class Model extends baseClass {
        save () {

            // $lab:coverage:off$
            if (!this.constructor.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.constructor.name));
            }
            // $lab:coverage:on$

            let self = this;
            let validate = self.constructor.capabilities.has('validation') ? self.validate.bind(self) : internals.shim;

            return validate().then(() => {

                self._type = self.constructor.name;
                return self.constructor.meta.get('db').insert(self);
            }).then((model) => {

                return validate();
            });
        };

        remove () {

            // $lab:coverage:off$
            if (!this.constructor.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.constructor.name));
            }
            // $lab:coverage:on$

            let self = this;
            return self.constructor.meta.get('db').remove({ _id: self._id }).then(() => {

                for (let key in self) {
                    delete self[key];
                }
            });
        };

        get () {

            // $lab:coverage:off$
            if (!this.constructor.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.constructor.name));
            }
            // $lab:coverage:on$

            let self = this;
            let validate = self.constructor.capabilities.has('validation') ? self.validate.bind(self) : internals.shim;

            return self.constructor.meta.get('db').findOne({ _id: self._id }).then((doc) => {

                if (!doc) {
                    throw new Error('Not found');
                }

                for (let key in doc) {
                    self[key] = doc[key];
                }

                return validate();
            });
        };

        static count (query) {

            // $lab:coverage:off$
            if (!this.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.name));
            }
            // $lab:coverage:on$

            query._type = this.name;
            return this.meta.get('db').count(query);
        };

        static find (query) {

            // $lab:coverage:off$
            if (!this.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.name));
            }
            // $lab:coverage:on$

            let self = this;
            query._type = self.name;
            return self.meta.get('db').find(query).then((docs) => {

                return Promise.all(docs.map((doc) => {

                    let model = new self(doc);
                    let validate = self.capabilities.has('validation') ? model.validate.bind(model) : internals.shim;
                    return validate().then(() => {

                        return model;
                    });
                }));
            }).catch(console.log.bind(console));
        };

        static findOne (query) {

            // $lab:coverage:off$
            if (!this.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.name));
            }
            // $lab:coverage:on$

            let self = this;
            query._type = self.name;
            return self.meta.get('db').findOne(query).then((doc) => {

                if (!doc) {
                    throw new Error('Not found');
                }

                let model = new self(doc);
                let validate = self.capabilities.has('validation') ? model.validate.bind(model) : internals.shim;
                return validate().then(() => {

                    return model;
                });
            });
        };

        static update (query, update, options) {

            // $lab:coverage:off$
            if (!this.meta.has('db')) {
                return Promise.reject(new Error('No db assigned to model class: ' + this.name));
            }
            // $lab:coverage:on$

            query._type = this.name;

            let updateMethods = ['$set', '$unset', '$inc', '$push', '$pop', '$addToSet', '$pull', '$each'];
            let isUpdate = false;
            for (let i = 0, il = updateMethods.length; i < il; ++i) {
                if (updateMethods[i] in update) {
                    isUpdate = true;
                    break;
                }
            }

            if (!isUpdate) {
                update._type = this.name;
            }

            return this.meta.get('db').update(query, update, options || {});
        };

        static set db (db) {

            let wrapped = internals.wrap(db);
            db.ensureIndex({ fieldName: '_type', sparse: true });
            this.meta.set('db', wrapped);
        };

        static set schema (val) {

            if (!this.capabilities.has('validation')) {
                return;
            }

            if (val.isJoi) {
                val = val.concat(Joi.object({ _id: Joi.string(), _type: Joi.string().strip() }));
            }
            else {
                val._id = Joi.string();
                val._type = Joi.string().strip();
            }

            super.schema = val;
        };
    };

    Model.capabilities.add('nedb');

    return Model;
};
