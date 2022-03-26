// package imports
const graphqljson = require('graphql-type-json');
const {GraphQLJSON} = graphqljson;
const graphql = require('graphql');
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLSchema,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull
} = graphql;
const _ = require('lodash');
const mongoose = require('mongoose');
// project imports
const Applicant = require('../database/models/applicant');
const Employer = require('../database/models/employer');
const Job = require('../database/models/job');
const Application = require('../database/models/application');

const ApplicantType = new GraphQLObjectType({
  name: 'Applicant',
  fields: () => ({
    id: { type: GraphQLID },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    email: { type: GraphQLString },
    resume: { type: GraphQLJSON },
  })
});

const EmployerType = new GraphQLObjectType({
  name: 'Employer',
  fields: () => ({
    id: { type: GraphQLID },
    email: { type: GraphQLString },
    companyName: { type: GraphQLString }
  })
});

const JobsCount = new GraphQLObjectType({
  name: 'JobsCount',
  fields: () => ({
    value: { type: GraphQLInt },
  })
});

const JobType = new GraphQLObjectType({
  name: 'Job',
  fields: () => ({
    id: { type: GraphQLID },
    title: { type: GraphQLString },
    companyName: { type: GraphQLString },
    salary: { type: GraphQLInt },
    currency: { type: GraphQLString },
    location: { type: GraphQLString },
    desc: { type: GraphQLString },
    applied: { type: GraphQLBoolean }
  })
});

const ApplicationType = new GraphQLObjectType({
  name: 'Application',
  fields: () => ({
    applicantId: { type: GraphQLID },
    jobId: { type: GraphQLID }
  })
});

const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType', 
  fields: {
    applicant: {
      type: ApplicantType,
      args: { id: { type: GraphQLID }},
      resolve(parent, args) {
        return Applicant.findOne({"_id": args.id})
      }
    },
    employer: {
      type: EmployerType,
      args: { id: { type: GraphQLID }},
      resolve(parent, args) {
        return Employer.findOne({"_id": args.id})
      }
    },
    jobCount: {
      type: JobsCount,
      args: { filter: { type: GraphQLString }},
      resolve(parent, args) {
        if (args.filter == null) {
          return {"value": Job.countDocuments({})}
        } else {
          const regex = new RegExp(args.filter, 'i');
          return {"value":Job.countDocuments({ $or: [{ title: {$regex: regex} }, { companyName: {$regex: regex} }, { location: {$regex: regex} }, { desc: {$regex: regex} }] })}
        }
      }
    },
    jobs: {
      type: new GraphQLList(JobType),
      args: {
        applicantId: { type: GraphQLID },
        first: { type: GraphQLInt },
        offset: { type: GraphQLInt },
        filter: { type: GraphQLString }
      },
      async resolve(parent, args) {
        var jobs = null;
        if (args.filter == null) {
          jobs = await Job.find({}).sort({createdAt: -1}).skip(args.offset).limit(args.first);
        } else {
          const regex = new RegExp(args.filter, 'i')
          jobs = await Job.find({ $or: [{ title: {$regex: regex} }, { companyName: {$regex: regex} }, { location: {$regex: regex} }, { desc: {$regex: regex} }] })
          .sort({createdAt: -1}).skip(args.offset).limit(args.first);
        }
        const res = jobs.map(async job => {
          let applied = await Application.exists({applicantId: mongoose.Types.ObjectId(args.applicantId), jobId: mongoose.Types.ObjectId(job.id)});
          return {
            id: job.id,
            title: job.title,
            companyName: job.companyName,
            salary: job.salary,
            currency: job.currency,
            location: job.location,
            desc: job.desc,
            applied: applied
        }});
        return res;
      }
    },
    applicationExists: {
      type: GraphQLBoolean,
      args: {
        applicantId: {type: GraphQLID},
        jobId: {type: GraphQLID}
      },
      resolve(parent, args) {
        return Application.exists({applicantId: args.applicantId, jobId: args.jobId});
      }
    },
    resumeExists: {
      type: GraphQLBoolean,
      args: { id: {type: GraphQLID} },
      async resolve(parent, args) {
        const applicant = await Applicant.findOne({"_id": args.id});
        return applicant.resume.get("originalname") != "No resume on file!";
      }
    }
  }
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createJob: {
      type: JobType,
      args: {
        title: { type: GraphQLString },
        companyName: { type: GraphQLString },
        salary: { type: GraphQLInt },
        currency: { type: GraphQLString },
        location: { type: GraphQLString },
        desc: { type: GraphQLString }
      },
      resolve(parent, args) {
        let job = new Job({
          title: args.title,
          companyName: args.companyName,
          salary: args.salary,
          currency: args.currency,
          location: args.location,
          desc: args.desc
        });
        return job.save();
      }
    },
    updateApplicant: {
      type: ApplicantType,
      args: {
        id: { type: GraphQLID },
        firstName: { type: GraphQLString },
        lastName: { type: GraphQLString },
      },
      resolve(parent, args) {
        Applicant.findOne({"_id": args.id}, function(err, applicant) {
          if(args.firstName !== undefined) {
            applicant.firstName = args.firstName;
          }
          if(args.lastName !== undefined) {
            applicant.lastName = args.lastName;
          }
          return applicant.save();
        });
      }
    }, 
    updateEmployer: {
      type: EmployerType,
      args: {
        id: { type: GraphQLID },
        companyName: { type: GraphQLString },
      },
      resolve(parent, args) {
        Employer.findOne({"_id": args.id}, function(err, employer) {
          employer.companyName = args.companyName;
          return employer.save();
        });
      }
    }
  }
})

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation
});