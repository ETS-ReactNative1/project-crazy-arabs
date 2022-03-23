const applicant = require('./database/models/applicant');
const employer = require('./database/models/employer');
const job = require('./database/models/job')
const nodemailer = require('nodemailer');
const recruitleAuth = require('./config.js').auth;

module.exports = {
    apply: (req, res, next) => {
        let jobId = req.body.jobId;
        let applicantId = req.username;
        applicant.findOne({_id: applicantId}, function(err, applicant){
            if (err) return res.status(500).end(err);
            if (!applicant) return res.status(404).end("User with id: " + applicantId + " does not exist");
            job.findOne({_id: jobId}, function(err, job) {
                if (err) return res.status(500).end(err);
                if (!job) return res.status(404).end("Job with id: " + jobId + " does not exist");
                employer.findOne({companyName: job.companyName}, function(err, employer) {
                    if (err) return res.status(500).end(err);
                    if (!employer) return res.status(404).end("Employer with name: " + job.companyName + " does not exist");

                    let mailTransporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: recruitleAuth
                    });

                    let mailDetails = {
                        from: 'recruitlejobs@gmail.com',
                        to: employer.email,
                        subject: 'Job Application - ' + job.title,
                        text: 'You have recieved an application from ' + applicant.firstName + ' ' + applicant.lastName
                    };

                    mailTransporter.sendMail(mailDetails, function(err, data) {
                        if(err) {
                            console.log('Error Occured');
                        } else {
                            console.log('Email sent successfully');
                        }
                    });
                });
            })
        }); 
    }
}