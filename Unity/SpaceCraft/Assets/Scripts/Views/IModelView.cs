/// <summary>
/// Interface for views that display model data
/// </summary>
/// <typeparam name="T">The type of model this view displays</typeparam>
public interface IModelView<T> where T : class
{
    /// <summary>
    /// Gets or sets the current model being displayed
    /// </summary>
    T Model { get; set; }
    
    /// <summary>
    /// Called when the model is updated and the view should refresh
    /// </summary>
    void HandleModelUpdated();
} 