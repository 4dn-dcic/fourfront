## Overview

* An online submission interface has been developed to help with the submission of 4DN metadata.  
* This web interface is especially useful for; 
    * submitting one or a few experiments
    * editing the metadata for an existing experiment 
    * understanding object dependencies in our metadata schemas (for example learning that every experiment needs a type and a biosample).  
* The system has been developed as a submission wizard that allows both the stepwise creation of database objects and full submission of an entire experiment with all required associated objects.  
* We do recommend you review the information on the [Getting Started page](/help/getting-started) to get some tips on important concepts like *aliases* and *Replicate Sets*.

## Creating New Items

There are several possible 'entry' points to a web submission

* You may want to start by entering metadata for an ExperimentSetReplicate object or an Experiment object of a particular type (eg. a Hi-C experiment or Microscopy experiment).  
* You can start by creating experiments and then as a subsequent step associating multiple experiments with a Replicate Set.  
* You can start your submission at a lower level item type (eg. Biosample) if that makes things easier for you.

**To create a new item**

1. Navigate to an item of the type for which you want to create metadata eg. [Hi-C Experiment 4DNEX5LRCIOK](https://data.4dnucleome.org/experiments-hi-c/4DNEX5LRCIOK/)

2. You can find **Create** and **Edit** links near the top of a page for most items in our system.  You will not see one or both of these buttons if you lack permission to perform these operations, which may be due to the status of the item and/or your role in our system.
3. When you click **Create** the first thing you will be asked is to create an alias for your item.  This is a lab specific unique identifier for this object taking the form of xxxx:xxxxx where the portion before the colon is a lab designation eg. 4dndcic and the portion after is an identifier that you choose that is unique within your lab group (see section on using aliases [here](/help/getting-started#referencing-existing-objects)).
4. When you submit your alias you will be brought to a page where you can start entering metadata.  
    * You will see two gray bars *Fields* and *Linked Objects* and selecting the *+* will expand those bars to show the fields and objects that can be entered.  
    * Hovering your pointer over the **i** next to Navigation pops up an explanation for what the different colors of the objects displayed in the Navigation tree.
    * If a field or object are required that is indicated.  
    * The *Fields* section is where you fill out basic fields that are not linked to other database objects.  
    * In the *Linked Objects* section you can link other Objects to the one you are working on, either by selecting from a list of available existing objects or by creating a new object of the type needed for the particular field it is linked to.
    * As you create or add linked Objects you will see the Objects listed in the *Navigate* section change colors accordingly.  
    * You can use the *Navigate* section to review what you have submitted, validated and what remains to be added.

5. And finally when all your linked objects are submitted and validated (green) you can validate and submit the object to complete your submission.


**WARNING: Be careful with the BACK and RELOAD buttons.** Currently, if you choose to create a new linked object and then decide you actually don't want to or should have actually chosen an existing object you still should create the object with only the minimum information required, Validate and then Submit it.  You will then be taken back to the previous form you were working on and be able to *remove* the unwanted object.  If you try to navigate back to the previous page using your browser buttons you will lose the previously unsubmitted changes.  We are working to improve this aspect of the interface.



## Editing Existing Objects

* You can use the online submission interface to make edits to existing items providing you have permission to do so.  
* If an object has been 'released' either to the 4DN project or to the public it can no longer be changed.  
* If the object has an 'in review' status then you can make changes to fields provided you are the submitter of that object or a submitter for the lab that submitted the object.

**WARNING: Please take care to be sure that the object you are editing is really the one you want to change.**

1. Navigate to that objects page and if the object is editable then you should see an **Edit** button.  
2. After clicking the **Edit** button you will be brought to a page as described above.  
3. This time if you click on the **+** in the *Fields* or *Linked Objects* sections you will see the existing values, to which you can make changes as needed.  
4. Then validate and submit to commit the changes to the system.
