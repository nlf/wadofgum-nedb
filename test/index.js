'use strict';

const Joi = require('joi');
const NeDB = require('nedb');
const Mixin = require('..');
const Validation = require('wadofgum-validation');
const Wadofgum = require('wadofgum');

const lab = exports.lab = require('lab').script();
const expect = require('code').expect;

lab.test('it can be loaded', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    expect(User).to.exist();
    expect(User.capabilities.has('nedb')).to.equal(true);
    done();
});

lab.test('it can have a db associated', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    expect(User.meta.get('db')).to.contain('insert', 'find', 'count', 'update', 'remove', 'raw');
    done();
});

lab.test('it does nothing when attempting to set a schema without a validation mixin', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.schema = { name: Joi.string() };
    expect(User.meta.has('keys')).to.equal(false);
    done();
});

lab.test('it can save a model', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    const user = new User({ name: 'test' });
    user.save().then(() => {

        expect(user).to.contain('name', '_id');
        done();
    }).catch(done);
});

lab.test('it rejects when attempting to save when no db is assigned', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    const user = new User({ name: 'test' });
    user.save().catch((err) => {

        expect(err.message).to.equal('No db assigned to model class: User');
        done();
    }).catch(done);
});

lab.test('it can fetch a model given its id', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    const user = new User({ name: 'test' });
    user.save().then(() => {

        const user2 = new User({ _id: user._id });
        expect(user2.name).to.not.exist();
        return user2.get().then(() => {

            expect(user2.name).to.equal(user.name);
            done();
        });
    }).catch(done);
});

lab.test('it returns an error when an id is not found', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    const user = new User({ name: 'test' });
    user.get().catch((err) => {

        expect(err.message).to.equal('Not found');
        done();
    }).catch(done);
});

lab.test('it can remove a model', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    const user = new User({ name: 'test' });
    user.save().then(() => {

        const id = user._id;
        return user.remove().then(() => {

            return User.findOne({ _id: id });
        }).catch((err) => {

            expect(user.name).to.not.exist();
            expect(err.message).to.equal('Not found');
            done();
        });
    }).catch(done);
});

lab.test('it can count models', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    User.count({ name: 'test' }).then((count) => {

        expect(count).to.equal(0);
        const user = new User({ name: 'test' });
        return user.save();
    }).then(() => {

        return User.count({ name: 'test' });
    }).then((count) => {

        expect(count).to.equal(1);
        done();
    }).catch(done);
});

lab.test('it can find models', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    const user = new User({ name: 'test' });
    User.find({ name: 'test' }).then((models) => {

        expect(models.length).to.equal(0);
        return user.save();
    }).then(() => {

        return User.find({ name: 'test' });
    }).then((models) => {

        expect(models.length).to.equal(1);
        expect(models[0]).to.deep.equal(user);
        done();
    }).catch(done);
});

lab.test('it can find a single model', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    const user = new User({ name: 'test' });
    User.findOne({ name: 'test' }).catch((err) => {

        expect(err.message).to.equal('Not found');
        return user.save();
    }).then(() => {

        return User.findOne({ name: 'test' });
    }).then((model) => {

        expect(model).to.deep.equal(user);
        done();
    }).catch(done);
});

lab.test('it can update models with a full document', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    const user = new User({ name: 'test' });
    User.find({ name: 'test' }).then((models) => {

        expect(models.length).to.equal(0);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(0);
        return user.save();
    }).then(() => {

        return User.update({ name: 'test' }, { name: 'not test' });
    }).then((count) => {

        expect(count).to.equal(1);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(1);
        expect(models[0].name).to.equal('not test');
        expect(models[0]._id).to.equal(user._id);
        done();
    }).catch(done);
});

lab.test('it can update models with a partial update', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    const user = new User({ name: 'test' });
    User.find({ name: 'test' }).then((models) => {

        expect(models.length).to.equal(0);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(0);
        return user.save();
    }).then(() => {

        return User.update({ name: 'test' }, { $set: { name: 'not test' } });
    }).then((count) => {

        expect(count).to.equal(1);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(1);
        expect(models[0].name).to.equal('not test');
        expect(models[0]._id).to.equal(user._id);
        done();
    }).catch(done);
});

lab.test('it can update models with options', (done) => {

    class User extends Wadofgum.mixin(Mixin) {};
    User.db = new NeDB();
    const user = new User({ name: 'test' });
    User.find({ name: 'test' }).then((models) => {

        expect(models.length).to.equal(0);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(0);
        return user.save();
    }).then(() => {

        return User.update({ name: 'test' }, { name: 'not test' }, { multi: true });
    }).then((count) => {

        expect(count).to.equal(1);
        return User.find({ name: 'not test' });
    }).then((models) => {

        expect(models.length).to.equal(1);
        expect(models[0].name).to.equal('not test');
        expect(models[0]._id).to.equal(user._id);
        done();
    }).catch(done);
});

lab.describe('when used with validation', () => {

    lab.test('it can extend a given schema', (done) => {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.schema = Joi.object({ name: Joi.string() });
        expect(User.meta.get('keys')).to.contain('name', '_id');
        done();
    });

    lab.test('it can extend a given schema by plain object', (done) => {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.schema = { name: Joi.string() };
        expect(User.meta.get('keys')).to.contain('name', '_id');
        done();
    });

    lab.test('it validates before saving', (done) => {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.db = new NeDB();
        User.schema = Joi.object({ name: Joi.string().required() });
        const user = new User();
        user.save().catch((err) => {

            expect(err.name).to.equal('ValidationError');
            done();
        }).catch(done);
    });

    lab.test('it validates after saving', (done) => {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.db = new NeDB();
        User.schema = Joi.object({ name: Joi.string().required() });
        const user = new User({ name: 'test' });
        user.save().then(() => {

            expect(user).to.contain('_id', 'name');
            done();
        }).catch(done);
    });

    lab.test('it validates after getting a model instance', (done) => {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.db = new NeDB();
        User.schema = Joi.object({ name: Joi.string().required() });
        const user = new User({ name: 'test' });
        user.save().then(() => {

            expect(user).to.contain('_id', 'name');
            const user2 = new User({ _id: user._id });
            return user2.get().then(() => {

                expect(user2).to.deep.equal(user);
                done();
            });
        }).catch(done);
    });

    lab.test('it validates after finding models', (done) => {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.db = new NeDB();
        User.schema = Joi.object({ name: Joi.string().required() });
        const user = new User({ name: 'test' });
        user.save().then(() => {

            expect(user).to.contain('_id', 'name');
            return User.find({ name: 'test' });
        }).then((users) => {

            expect(users.length).to.equal(1);
            expect(users[0]).to.deep.equal(user);
            done();
        }).catch(done);
    });

    lab.test('it validates after finding one model', (done) => {

        class User extends Wadofgum.mixin(Validation, Mixin) {};
        User.db = new NeDB();
        User.schema = Joi.object({ name: Joi.string().required() });
        const user = new User({ name: 'test' });
        user.save().then(() => {

            expect(user).to.contain('_id', 'name');
            return User.findOne({ name: 'test' });
        }).then((innerUser) => {

            expect(innerUser).to.deep.equal(user);
            done();
        }).catch(done);
    });
});

