## Overview 

An online submission interface has been developed to help with the submission of 4DN metadata.  This web interface is especially useful for; submitting one or a few experiments, editing the metadata for an existing experiment and can also be helpful for understanding object dependencies in our metadata schemas (for example every experiment needs a biosample).  The system has been developed as a submission wizard that allows both the stepwise creation of database objects and full submission of an entire experiment with all required associated objects.

## Creating New Items

You are very likely want to start by entering metadata for an Experiment object of a particular type (eg. a Hi-C experiment or Microscopy experiment).  However, you can start your submission at a lower level item type if that makes things easier for you.
Navigate to an item of the type for which you want to create metadata eg. [Hi-C Experiment 4DNEX5LRCIOK](https://testportal.4dnucleome.org/experiments-hi-c/4DNEX5LRCIOK/)  

Currently you can find **Create** and **Edit** links near the top of a page for most items in our system.  You will not see one or both of these buttons if you lack permission to perform these operations, which may be due to the status of the item and/or your role in our system. 

When you click **Create** the first thing you will be asked is to create an alias for your item.  This is a lab specific unique identifier for this object taking the form of xxxx:xxxxx where the portion before the colon is a lab designation eg. 4dndcic and the portion after is an identifier that you choose that is unique within your lab group (see section on aliases here).

When you submit your alias you will be brought to a page where you can start entering metadata.  You will see two gray bars *Fields* and *Linked Objects* and selecting the *+* will expand those bars to show the fields and objects that can be entered.  Hovering your pointer over the **i** next to Navigation provides information and a key about the status of items in your sub
