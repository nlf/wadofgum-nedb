var internals = {};
internals.save = function (callback) {

    var self = this;
    self.validate(function (err) {

        if (err) {
            return callback(err);
        }

        self._type = self.factory.type;
        self.factory.db.insert(self, function (err) {

            self.validate();
            callback(err);
        });
    });
};

internals.remove = function (callback) {

    this.factory.db.remove({ _type: this.factory.type, _id: this.id }, function (err) {

        callback(err);
    });
};

internals.count = function (query, callback) {

    if (typeof query === 'function') {
        callback = query;
        query = {};
    }

    query._type = this.type;
    this.db.count(query, callback);
};

internals.find = function (query, callback) {

    if (typeof query === 'function') {
        callback = query;
        query = {};
    }

    var self = this;
    query._type = self.type;
    self.db.find(query, function (err, models) {

        callback(err, [].concat(models).map(function (model) {

            return new self(model);
        }));
    });
};

internals.get = function (id, callback) {

    var self = this;
    self.db.findOne({ _type: self.type, _id: id }, function (err, model) {

        if (!model &&
           !err) {

            err = new Error('not found');
        }

        callback(err, model ? new self(model) : undefined);
    });
};

exports.register = function (model, options) {

    options = options || {};
    if (!options.db) {
        throw new Error('Must provide an NeDB database');
    }

    model.extend({
        db: options.db,
        count: internals.count,
        find: internals.find,
        get: internals.get
    });

    model.method({
        save: internals.save,
        remove: internals.remove
    });

    model.on('preValidate', function (model) {

        model.id = model._id;
    });

    options.db.ensureIndex({ fieldName: 'type', sparse: true });
};
